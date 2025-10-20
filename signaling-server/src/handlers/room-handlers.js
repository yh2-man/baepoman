const db = require('../db/Db');
const WebSocket = require('ws');

// Helper function to send data to a WebSocket client
const send = (ws, type, payload) => {
    ws.send(JSON.stringify({ type, payload }));
};

// Helper function to broadcast data to all clients in the lobby
const broadcastToLobby = (wss, type, payload) => {
    const message = JSON.stringify({ type, payload });
    wss.clients.forEach(client => {
        // Send to clients who are connected but not in a room
        if (client.readyState === WebSocket.OPEN && !client.roomId) {
            client.send(message);
        }
    });
};

async function handleGetRooms(ws, payload, rooms) {
    console.log('Received request for room list.'); // <--- DEBUG LOG
    try {
        const query = `
            SELECT 
                r.id, 
                r.name, 
                r.category, 
                r.max_participants AS "maxParticipants", 
                u.username AS "hostName"
            FROM rooms r
            JOIN users u ON r.host_id = u.id
            ORDER BY r.created_at DESC;
        `;
        const result = await db.query(query);
        const dbRooms = result.rows;

        // Enhance with live participant count from the in-memory 'rooms' map
        const liveRooms = dbRooms.map(room => ({
            ...room,
            participantCount: rooms.get(room.id)?.size || 0,
        }));

        send(ws, 'rooms-list', liveRooms);
    } catch (error) {
        console.error('Failed to get rooms:', error);
        send(ws, 'error', { message: 'Failed to retrieve room list.' });
    }
}


async function handleCreateRoom(ws, payload, rooms, wss) {
    const { name, category, maxParticipants, userId } = payload;
    if (!name || !userId || !maxParticipants) {
        return send(ws, 'error', { message: 'Room name, max participants, and user ID are required.' });
    }

    try {
        const result = await db.query(
            'INSERT INTO rooms (name, category, host_id, max_participants) VALUES ($1, $2, $3, $4) RETURNING id, name, category, max_participants AS "maxParticipants", created_at',
            [name, category, userId, maxParticipants]
        );
        const newRoom = result.rows[0];
        
        // Add host username to the new room object
        const userResult = await db.query('SELECT username FROM users WHERE id = $1', [userId]);
        const hostName = userResult.rows[0]?.username;

        const roomForClient = {
            ...newRoom,
            hostName,
            participantCount: 0 // Starts with 0, will be 1 after join
        };

        // Broadcast to all clients in the lobby
        broadcastToLobby(wss, 'room-created', roomForClient);
        
        // Also send a specific confirmation to the creator, which can include more data if needed
        send(ws, 'room-creation-success', roomForClient); 

        console.log(`Room created in DB: ${newRoom.name} (ID: ${newRoom.id}) by user ${userId}`);

    } catch (error) {
        console.error('Failed to create room:', error);
        send(ws, 'error', { message: 'Failed to create room.' });
    }
}

async function handleJoinRoom(ws, payload, rooms, wss) { // Add wss
    const { roomId, userId } = payload;
    
    try {
        // Ensure the room exists in the database before joining
        const dbResult = await db.query('SELECT * FROM rooms WHERE id = $1', [roomId]);
        if (dbResult.rows.length === 0) {
            return send(ws, 'error', { message: 'Room not found.' });
        }
        
        const dbRoom = dbResult.rows[0];
        let room = rooms.get(roomId);

        // If room is not in memory, create it
        if (!room) {
            room = new Set();
            rooms.set(roomId, room);
        }

        // Check if room is full
        if (room.size >= dbRoom.max_participants) {
            return send(ws, 'error', { message: 'Room is full.' });
        }

        // If user is already in another room, make them leave first
        if (ws.roomId && ws.roomId !== roomId) {
            await handleLeaveRoom(ws, {}, rooms, wss); // Pass wss, await it
        }

        ws.roomId = roomId;
        ws.userId = userId;
        room.add(ws);

        // Notify lobby of participant count change
        broadcastToLobby(wss, 'room-updated', { roomId, participantCount: room.size });

        // Notify other clients in the room
        // Fetch the username for the joining user to send a complete user object
        const joiningUserResult = await db.query('SELECT username FROM users WHERE id = $1', [userId]);
        const joiningUsername = joiningUserResult.rows[0]?.username || 'Unknown User';
        const joiningUser = { id: userId, username: joiningUsername };

        room.forEach(client => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ type: 'user-joined', payload: { user: joiningUser } }));
            }
        });

        send(ws, 'joined-room', { roomId });

        // Prepare and send room-info to the newly joined client
        const currentParticipants = await Promise.all(Array.from(room).map(async client => {
            let username = client.username;
            if (!username && client.userId) {
                const userResult = await db.query('SELECT username FROM users WHERE id = $1', [client.userId]);
                username = userResult.rows[0]?.username || 'Unknown User';
            }
                        return {                id: client.userId,
                username: username,
            };
        }));

        const roomInfoPayload = {
            room: {
                id: dbRoom.id,
                name: dbRoom.name,
                category: dbRoom.category,
                hostId: dbRoom.host_id,
                maxParticipants: dbRoom.max_participants,
            },
            participants: currentParticipants,
        };
        send(ws, 'room-info', roomInfoPayload);

        console.log(`User ${userId} joined room ${roomId}. Current participants: ${room.size}`);

    } catch (error) {
        console.error(`Failed to join room ${roomId}:`, error);
        send(ws, 'error', { message: 'Error joining room.' });
    }
}

async function handleLeaveRoom(ws, payload, rooms, wss) {
    const { roomId, userId } = ws;
    if (!roomId) return;

    const room = rooms.get(roomId);
    if (room) {
        room.delete(ws);
        console.log(`User ${userId} left room ${roomId}. Remaining participants: ${room.size}`);

        // Notify lobby of participant count change
        broadcastToLobby(wss, 'room-updated', { roomId, participantCount: room.size });

        // Notify remaining clients in the same room
        room.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ type: 'user-left', payload: { userId } }));
            }
        });

        // If the room is now empty, remove it from memory, DB, and notify lobby
        if (room.size === 0) {
            console.log(`[DEBUG] Room ${roomId} is empty. Attempting to delete from memory and DB.`);
            rooms.delete(roomId);
            try {
                const deleteResult = await db.query('DELETE FROM rooms WHERE id = $1', [roomId]);
                console.log(`[DEBUG] DB Delete result for room ${roomId}:`, deleteResult.rowCount);
                // Broadcast to lobby that the room is deleted
                broadcastToLobby(wss, 'room-deleted', { roomId });
                console.log(`[DEBUG] Broadcasted 'room-deleted' for room ${roomId}.`);
            } catch (error) {
                console.error(`[DEBUG] Failed to delete room ${roomId} from database:`, error);
            }
        } else { // Room still has participants
            // Check if the leaving user was the host
            const roomDbResult = await db.query('SELECT host_id FROM rooms WHERE id = $1', [roomId]);
            const currentHostId = roomDbResult.rows[0]?.host_id;

            if (currentHostId === userId) {
                // Host is leaving, elect a new host
                const remainingParticipants = Array.from(room);
                if (remainingParticipants.length > 0) {
                    const newHostWs = remainingParticipants[0]; // Elect the first remaining participant
                    const newHostId = newHostWs.userId;

                    // Update host in DB
                    await db.query('UPDATE rooms SET host_id = $1 WHERE id = $2', [newHostId, roomId]);
                    console.log(`[DEBUG] Room ${roomId}: Host changed from ${userId} to ${newHostId}.`);

                    // Notify all remaining clients in the room about the new host
                    room.forEach(client => {
                        if (client.readyState === WebSocket.OPEN) {
                            send(client, 'host-changed', { roomId, newHostId });
                        }
                    });

                    // Update lobby with new host info
                    const newHostUserResult = await db.query('SELECT username FROM users WHERE id = $1', [newHostId]);
                    const newHostUsername = newHostUserResult.rows[0]?.username;
                    broadcastToLobby(wss, 'room-updated', { roomId, hostId: newHostId, hostName: newHostUsername, participantCount: room.size });

                } else {
                    // This case should ideally be handled by room.size === 0, but as a fallback
                    console.log(`[DEBUG] Room ${roomId} is empty after host left. Deleting.`);
                    rooms.delete(roomId);
                    try {
                        await db.query('DELETE FROM rooms WHERE id = $1', [roomId]);
                        broadcastToLobby(wss, 'room-deleted', { roomId });
                    } catch (error) {
                        console.error(`[DEBUG] Failed to delete room ${roomId} from database after host left:`, error);
                    }
                }
            } else {
                console.log(`[DEBUG] User ${userId} left room ${roomId}. Not host. Room still has participants: ${room.size}.`);
                // Only update participant count in lobby if non-host leaves
                broadcastToLobby(wss, 'room-updated', { roomId, participantCount: room.size });
            }
        }
    }
    ws.roomId = null;
}

async function handleChatMessage(ws, payload, rooms) {
    const { roomId, userId, message } = payload;
    if (!roomId || !userId || !message) return;

    try {
        // 1. Save message to DB
        const result = await db.query(
            'INSERT INTO chat_messages (room_id, user_id, message) VALUES ($1, $2, $3) RETURNING id, created_at',
            [roomId, userId, message]
        );
        const { id: messageId, created_at: timestamp } = result.rows[0];

        // 2. Fetch sender's username and profile image URL
        const userResult = await db.query(
            'SELECT username, profile_image_url FROM users WHERE id = $1',
            [userId]
        );
        const sender = userResult.rows[0];

        // 3. Broadcast message to all clients in the room
        const room = rooms.get(roomId);
        if (room) {
            room.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    send(client, 'new-message', {
                        id: messageId, // Include message ID
                        roomId,
                        userId,
                        username: sender.username,
                        profile_image_url: sender.profile_image_url,
                        message,
                        timestamp,
                    });
                }
            });
        }
    } catch (error) {
        console.error('Failed to save or broadcast chat message:', error);
    }
}

function handleWebRTCSignaling(ws, payload, rooms, wss) {
    console.log(`[DEBUG] Server: handleWebRTCSignaling called. Type: ${payload.type}, Sender: ${ws.userId}, Target: ${payload.payload.targetUserId}`); // Updated log
    const { targetUserId, ...signalingData } = payload.payload; // Corrected access
    const senderId = ws.userId; // The sender is the current WebSocket's user

    if (!targetUserId || !senderId) {
        console.error('WebRTC signaling: targetUserId or senderId is missing.');
        return;
    }

    // Find the target client in the same room
    let targetClient = null;
    if (ws.roomId) {
        const room = rooms.get(ws.roomId);
        if (room) {
            room.forEach(client => {
                if (client.userId === targetUserId) {
                    targetClient = client;
                }
            });
        }
    }

    if (targetClient && targetClient.readyState === WebSocket.OPEN) {
        // Relay the signaling message to the target client
        send(targetClient, payload.type, { ...signalingData, senderId });
    } else {
        console.warn(`WebRTC signaling: Target client ${targetUserId} not found or not open.`);
        // Optionally, send an error back to the sender
        send(ws, 'error', { message: `Target user ${targetUserId} is not available for WebRTC signaling.` });
    }
}


async function handleGetChatHistory(ws, payload) {
    const { roomId, beforeMessageId, limit = 50 } = payload; // Default limit to 50 messages
    if (!roomId) {
        return send(ws, 'error', { message: 'Room ID is required to fetch chat history.' });
    }

    try {
        let query = `
            SELECT
                cm.id,
                cm.room_id AS "roomId",
                cm.user_id AS "userId",
                u.username,
                u.profile_image_url AS "profileImageUrl",
                cm.message,
                cm.created_at AS "timestamp"
            FROM chat_messages cm
            JOIN users u ON cm.user_id = u.id
            WHERE cm.room_id = $1
        `;
        const queryParams = [roomId];
        let paramIndex = 2;

        if (beforeMessageId) {
            query += ` AND cm.id < $${paramIndex++}`;
            queryParams.push(beforeMessageId);
        }

        query += ` ORDER BY cm.created_at DESC LIMIT $${paramIndex++}`;
        queryParams.push(limit);

        const result = await db.query(query, queryParams);
        const chatHistory = result.rows.reverse(); // Reverse to get oldest first

        send(ws, 'chat-history', { roomId, messages: chatHistory });

    } catch (error) {
        console.error('Failed to fetch chat history:', error);
        send(ws, 'error', { message: 'Failed to fetch chat history.' });
    }
}

module.exports = {
    handleGetRooms,
    handleCreateRoom,
    handleJoinRoom,
    handleLeaveRoom,
    handleChatMessage,
    handleWebRTCSignaling,
    handleGetChatHistory, // Export the new handler
};
