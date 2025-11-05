const WebSocket = require('ws');
const { handleLogin, handleSignup, handleUpdateProfile } = require('./handlers/auth.js');
const { handleEmailVerification } = require('./handlers/verification.js');
const { handleGetUserProfile } = require('./handlers/user-handlers.js');
const {
    handleGetRooms, 
    handleCreateRoom, 
    handleJoinRoom, 
    handleLeaveRoom, 
    handleChatMessage,
    handleWebRTCSignaling,
    handleGetChatHistory, // Add new handler for getting chat history
    handleDeleteMessage,
    handleGetCategories,
} = require('./handlers/room-handlers.js');

const messageHandlers = {
    // Auth
    'login': handleLogin,
    'signup': handleSignup,
    'verify-email': handleEmailVerification,
    'update-profile': handleUpdateProfile,

    // User
    'get-user-profile': handleGetUserProfile,
    
    // Rooms
    'get-rooms': handleGetRooms,
    'create-room': handleCreateRoom,
    'join-room': handleJoinRoom,
    'leave-room': handleLeaveRoom,
    'get-categories': handleGetCategories,

    // Chat
    'chat-message': handleChatMessage,
    'get-chat-history': handleGetChatHistory,
    'delete-message': handleDeleteMessage,

    // WebRTC Signaling
    'offer': handleWebRTCSignaling,
    'answer': handleWebRTCSignaling,
    'ice-candidate': handleWebRTCSignaling,
    
    // Add other message types and their handlers here
};
function dispatchMessage(ws, message, wss, rooms) { // Pass rooms map
    let data;
    try {
        const messageStr = message.toString();
        data = JSON.parse(messageStr);
    } catch (e) {
        console.error("Failed to parse message or message is not JSON", e);
        // If message is not a JSON, it might be a Blob for WebRTC
        // This part needs to be smarter, broadcasting to a specific room
        if (ws.roomId) {
            const room = rooms.get(ws.roomId);
            if (room) {
                room.forEach((client) => {
                    if (client !== ws && client.readyState === WebSocket.OPEN) {
                        client.send(message);
                    }
                });
            }
        }
        return;
    }

    const handler = messageHandlers[data.type];
    if (handler) {
        // Pass rooms map to the handler if it needs it
        const payloadExpectedHandlers = [
            'login', 'signup', 'update-profile', 'verify-email', 'get-user-profile',
            'get-rooms', 'create-room', 'join-room', 'leave-room', 'chat-message', 'get-chat-history', 'delete-message', 'get-categories',
            'stream-id-map' // Add stream-id-map here
        ];

        if (payloadExpectedHandlers.includes(data.type)) {
            handler(ws, data.payload, rooms, wss);
        } else {
            // Handlers that expect the full data object (e.g., WebRTC signaling)
            handler(ws, data, rooms, wss);
        }
    } else {
        // Default: For WebRTC signaling, broadcast to the client's room
        if (ws.roomId) {
            const room = rooms.get(ws.roomId);
            if (room) {
                room.forEach((client) => {
                    if (client !== ws && client.readyState === WebSocket.OPEN) {
                        client.send(message.toString());
                    }
                });
            }
        }
    }
}

module.exports = dispatchMessage;