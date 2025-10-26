const WebSocket = require('ws');
const dispatchMessage = require('./message-dispatcher.js');
const db = require('./db/Db.js');

class WebSocketServer {
    constructor() {
        this.wss = null;
        this.rooms = new Map();
    }

    start(server) {
        this.wss = new WebSocket.Server({ noServer: true });

        server.on('upgrade', (request, socket, head) => {
            this.wss.handleUpgrade(request, socket, head, (ws) => {
                this.wss.emit('connection', ws, request);
            });
        });

        this.wss.on('connection', (ws) => {
            this.handleConnection(ws);
        });

        console.log('WebSocket server started and attached to HTTP server.');
    }

    handleConnection(ws) {
        console.log('Client connected.');

        ws.on('message', (message) => {
            dispatchMessage(ws, message, this.wss, this.rooms);
        });

        ws.on('close', () => {
            this.handleClose(ws);
        });

        ws.on('error', (error) => {
            console.error('WebSocket error:', error);
        });
    }

    async handleClose(ws) {
        console.log('Client disconnected.');
        if (ws.roomId) {
            const room = this.rooms.get(ws.roomId);
            if (room) {
                room.delete(ws);
                if (room.size === 0) {
                    this.rooms.delete(ws.roomId);
                    console.log(`Room ${ws.roomId} is empty. Deleting from memory and DB.`);
                    try {
                        // Note: This assumes you have a method in your Db module to handle this
                        await db.query('DELETE FROM rooms WHERE id = $1', [ws.roomId]);
                        console.log(`Room ${ws.roomId} deleted from database.`);
                    } catch (error) {
                        console.error(`Failed to delete room ${ws.roomId} from database:`, error);
                    }
                } else {
                    // Notify remaining clients
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
    }
}

// Export a singleton instance
module.exports = new WebSocketServer();
