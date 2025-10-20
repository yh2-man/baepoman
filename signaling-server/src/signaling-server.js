const http = require('http');
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const WebSocket = require('ws');
const dispatchMessage = require('./message-dispatcher.js');
const db = require('./db/Db.js');

// --- Create uploads directory if it doesn't exist ---
const uploadsDir = path.join(__dirname, '..', 'uploads', 'profiles');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// --- HTTP Server Setup using Express ---
const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json());

// Serve profile images statically
app.use('/uploads/profiles', express.static(uploadsDir));


// --- WebSocket Server Setup ---
const wss = new WebSocket.Server({ noServer: true }); // We will handle the upgrade manually

// Map to track rooms and their occupants
const rooms = new Map();

function startSignaling() {
    // The wss is now attached to the Express server, so we listen on the server object
    server.listen(3001, () => {
        console.log('HTTP and Signaling server running on port 3001.');
    });

    server.on('upgrade', (request, socket, head) => {
        wss.handleUpgrade(request, socket, head, (ws) => {
            wss.emit('connection', ws, request);
        });
    });

    wss.on('connection', (ws) => {
        console.log('Client connected.');

        ws.on('message', (message) => {
            dispatchMessage(ws, message, wss, rooms);
        });

        ws.on('close', async () => {
            console.log('Client disconnected.');
            if (ws.roomId) {
                const room = rooms.get(ws.roomId);
                if (room) {
                    room.delete(ws);
                    if (room.size === 0) {
                        rooms.delete(ws.roomId);
                        console.log(`Room ${ws.roomId} is empty. Deleting from memory.`);
                        try {
                            await db.query('DELETE FROM rooms WHERE id = $1', [ws.roomId]);
                            console.log(`Room ${ws.roomId} deleted from database.`);
                        } catch (error) {
                            console.error(`Failed to delete room ${ws.roomId} from database:`, error);
                        }
                    } else {
                        room.forEach(client => {
                            if (client.readyState === WebSocket.OPEN) {
                                client.send(JSON.stringify({
                                    type: 'user-left',
                                    payload: { userId: ws.userId }
                                }));
                            }
                        });
                    }
                }
            }
        });

        ws.on('error', (error) => {
            console.error('WebSocket error:', error);
        });
    });

    // --- HTTP Routes ---
    const profileRoutes = require('./routes/profile.js');
    app.use('/api', profileRoutes);

    // Example: app.get('/health', (req, res) => res.send('OK'));
}

module.exports = startSignaling;
