const WebSocket = require('ws');
const dispatchMessage = require('./message-dispatcher.js');
const { handleLeaveRoom } = require('./handlers/room-handlers.js'); // Import the handler

class WebSocketServer {
    constructor() {
        this.wss = null;
        this.rooms = new Map();
        this.userRoomMap = new Map(); // New map to track userId -> roomId
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
            dispatchMessage(ws, message, this.wss, this.rooms, this.userRoomMap); // Pass userRoomMap
        });

        ws.on('close', () => {
            this.handleClose(ws);
        });

        ws.on('error', (error) => {
            console.error('WebSocket error:', error);
        });
    }

    async handleClose(ws) {
        console.log(`Client disconnected (userId: ${ws.userId}). Handling leave logic...`);
        // Centralize leave logic by calling the same handler used for explicit leave messages.
        // The handler is now robust enough to get the roomId from the ws object when the payload is empty.
        if (ws.roomId) {
            await handleLeaveRoom(ws, {}, this.wss, this.rooms, this.userRoomMap);
        }
    }
}

// Export a singleton instance
module.exports = new WebSocketServer();
