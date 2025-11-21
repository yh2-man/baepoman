const db = require('../db/Db');
const WebSocket = require('ws');
const { getUserDetails } = require('../utils/db-helpers');

// Helper function to send data to a WebSocket client
const send = (ws, type, payload) => {
    ws.send(JSON.stringify({ type, payload }));
};

// Helper function to broadcast data to all clients in the lobby
const broadcastToLobby = (wss, type, payload) => {
    const message = JSON.stringify({ type, payload });
    wss.clients.forEach(client => {
        // Send to all connected clients. The client-side will decide what to do with the info.
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
};

// Helper function to get categories
async function handleGetCategories(ws) {
    try {
        const result = await db.query('SELECT id, name, image_url FROM categories ORDER BY name ASC');
        send(ws, 'categories-list', result.rows);
    } catch (error) {
        console.error('Failed to get categories:', error);
        send(ws, 'error', { message: 'Failed to retrieve categories list.' });
    }
}

async function handleGetRooms(ws, payload, wss, rooms) {
    console.log('Received request for room list.');
    try {
        const query = `
            SELECT 
                r.id, 
                r.name, 
                r.room_type AS "roomType",
                r.is_private AS "isPrivate",
                r.max_participants AS "maxParticipants", 
                u.username AS "hostName",
                c.name AS "categoryName",
                c.image_url AS "categoryImageUrl"
            FROM rooms r
            INNER JOIN users u ON r.host_id = u.id
            LEFT JOIN categories c ON r.category_id = c.id
            WHERE r.room_type = 'group' -- Only show group rooms in the lobby list
            ORDER BY r.created_at DESC;
        `;
        const result = await db.query(query);
        const dbRooms = result.rows;

        const liveRooms = dbRooms.map(room => ({
            ...room,
            categoryImageUrl: room.categoryImageUrl ? `http://localhost:3001${room.categoryImageUrl}` : null,
            participantCount: rooms.get(String(room.id))?.size || 0, // Convert room.id to string for map lookup
        }));

        send(ws, 'rooms-list', liveRooms);
    } catch (error) {
        console.error('Failed to get rooms:', error);
        send(ws, 'error', { message: 'Failed to retrieve room list.' });
    }
}


async function handleCreateRoom(ws, payload, wss, rooms) {
    console.log('[Room-Handler] handleCreateRoom called with payload:', payload);
    const { name, categoryId, maxParticipants, userId, isPrivate, roomType = 'group' } = payload;
    // For group rooms, name is required. For DM rooms, name can be null.
    if (!userId || !maxParticipants) {
        return send(ws, 'error', { message: 'User ID and max participants are required.' });
    }
    if (roomType === 'group' && !name) {
        return send(ws, 'error', { message: 'Room name is required for group rooms.' });
    }

    try {
        const result = await db.query(
            'INSERT INTO rooms (name, room_type, category_id, host_id, max_participants, is_private) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, name, room_type AS "roomType", category_id AS "categoryId", max_participants AS "maxParticipants", is_private AS "isPrivate", created_at',
            [name || null, roomType, categoryId || null, userId, maxParticipants, isPrivate]
        );
        const newRoom = result.rows[0];
        
        const host = await getUserDetails(userId);
        const hostName = host ? host.username : 'Unknown';

        let categoryName = null;
        let categoryImageUrl = null;
        if (newRoom.categoryId) {
            const categoryResult = await db.query('SELECT name, image_url FROM categories WHERE id = $1', [newRoom.categoryId]);
            if (categoryResult.rows.length > 0) {
                categoryName = categoryResult.rows[0].name;
                categoryImageUrl = categoryResult.rows[0].image_url;
            }
        }

        const roomForClient = {
            ...newRoom,
            hostName,
            categoryName,
            categoryImageUrl: categoryImageUrl ? `http://localhost:3001${categoryImageUrl}` : null,
            participantCount: 0 // Starts with 0, will be 1 after join
        };

        // Broadcast to all clients in the lobby if it's a group room
        if (roomType === 'group') {
            broadcastToLobby(wss, 'room-created', roomForClient);
        }
        
        // Also send a specific confirmation to the creator, which can include more data if needed
        send(ws, 'room-creation-success', roomForClient); 

        console.log(`Room created in DB: ${newRoom.name} (ID: ${newRoom.id}) by user ${userId}. Type: ${roomType}`);

    } catch (error) {
        console.error('Failed to create room:', error);
        send(ws, 'error', { message: 'Failed to create room.' });
    }
}

async function handleJoinRoom(ws, payload, wss, rooms, userRoomMap) { // Add userRoomMap
    const { roomId, userId } = payload;
    
    try {
        const dbRoomResult = await db.query(
            `SELECT 
                r.id, r.name, r.room_type AS "roomType", r.is_private AS "isPrivate", 
                r.max_participants AS "maxParticipants", r.host_id AS "hostId", r.category_id AS "categoryId",
                c.name AS "categoryName", c.image_url AS "categoryImageUrl"
            FROM rooms r
            LEFT JOIN categories c ON r.category_id = c.id
            WHERE r.id = $1`,
            [roomId]
        );
        if (dbRoomResult.rows.length === 0) {
            return send(ws, 'error', { message: 'Room not found.' });
        }
        
        const dbRoom = dbRoomResult.rows[0];
        let room = rooms.get(roomId);

        if (!room) {
            room = new Set();
            rooms.set(roomId, room);
        }

        if (room.size >= dbRoom.maxParticipants) {
            return send(ws, 'error', { message: 'Room is full.' });
        }

        // --- Simplified Logic ---

        // 1. Get details for all users (existing participants + new one)
        const existingUserIds = Array.from(room).map(client => client.userId);
        const allUserIds = [...existingUserIds, userId];
        
        const userDetailsPromises = allUserIds.map(id => getUserDetails(id));
        const allUserDetails = (await Promise.all(userDetailsPromises)).filter(p => p !== null);

        const joiningUser = allUserDetails.find(u => u.id === userId);
        if (!joiningUser) {
            return send(ws, 'error', { message: 'Joining user could not be verified.' });
        }

        // 2. Now that data is fetched, update the state
        ws.roomId = roomId;
        ws.userId = userId;
        userRoomMap.set(userId, roomId);
        room.add(ws);

        // 3. Prepare and send payloads
        const roomInfoPayload = {
            room: {
                id: dbRoom.id,
                name: dbRoom.name,
                roomType: dbRoom.roomType,
                isPrivate: dbRoom.isPrivate,
                categoryName: dbRoom.categoryName,
                categoryImageUrl: dbRoom.categoryImageUrl ? `http://localhost:3001${dbRoom.categoryImageUrl}` : null,
                hostId: dbRoom.hostId,
                maxParticipants: dbRoom.maxParticipants,
            },
            participants: allUserDetails, // Send the full, updated list
        };

        send(ws, 'room-info', roomInfoPayload);
        send(ws, 'joined-room', { roomId });

        setTimeout(() => {
            room.forEach(client => {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                    send(client, 'user-joined', { user: joiningUser });
                }
            });
        }, 100);

        broadcastToLobby(wss, 'room-updated', { roomId, participantCount: room.size });

        console.log(`User ${userId} joined room ${roomId}. Current participants: ${room.size}`);

    } catch (error) {
        console.error(`Failed to join room ${roomId}:`, error);
        send(ws, 'error', { message: 'Error joining room.' });
    }
}

async function handleLeaveRoom(ws, payload, wss, rooms, userRoomMap) { // Add userRoomMap
    // Prioritize payload for users leaving from lobby, fallback to ws properties for direct disconnects
    const roomIdToLeave = payload?.roomId || ws.roomId;
    const userIdToLeave = payload?.userId || ws.userId;

    if (!roomIdToLeave) return;

    const room = rooms.get(roomIdToLeave);
    if (room) {
        // Find the correct websocket client to remove
        let clientToRemove = ws;
        if (payload?.userId && payload.userId !== ws.userId) {
            // This case handles a host kicking a user, not relevant now but good practice
            for (const client of room) {
                if (client.userId === payload.userId) {
                    clientToRemove = client;
                    break;
                }
            }
        }
        
        room.delete(clientToRemove);
        // The user is now officially out of the room. Clear their server-side state immediately.
        clientToRemove.roomId = null;
        userRoomMap.delete(userIdToLeave);

        console.log(`User ${userIdToLeave} left room ${roomIdToLeave}. Remaining participants: ${room.size}`);

        // Fetch room details to get room_type and is_private
        const roomDetailsResult = await db.query('SELECT room_type, is_private FROM rooms WHERE id = $1', [roomIdToLeave]);
        const roomType = roomDetailsResult.rows[0]?.room_type || 'group';
        const isPrivate = roomDetailsResult.rows[0]?.is_private || false;

        // Notify lobby of participant count change (only for group rooms)
        if (roomType === 'group') {
            broadcastToLobby(wss, 'room-updated', { roomId: roomIdToLeave, participantCount: room.size, roomType, isPrivate });
        }

        // Notify remaining clients in the same room
        room.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                send(client, 'user-left', { userId: userIdToLeave });
            }
        });

        // If the room is now empty, remove it from memory, DB, and notify lobby
        if (room.size === 0) {
            console.log(`[DEBUG] Room ${roomIdToLeave} is empty. Attempting to delete from memory and DB.`);
            rooms.delete(roomIdToLeave);
            // Only delete group rooms from DB when empty. DM rooms might persist.
            if (roomType === 'group') {
                try {
                    const deleteResult = await db.query('DELETE FROM rooms WHERE id = $1', [roomIdToLeave]);
                    console.log(`[DEBUG] DB Delete result for room ${roomIdToLeave}:`, deleteResult.rowCount);
                    // Broadcast to lobby that the room is deleted
                    broadcastToLobby(wss, 'room-deleted', { roomId: roomIdToLeave });
                    console.log(`[DEBUG] Broadcasted 'room-deleted' for room ${roomIdToLeave}.`);
                } catch (error) {
                    console.error(`[DEBUG] Failed to delete room ${roomIdToLeave} from database:`, error);
                }
            } else if (roomType === 'dm') {
                console.log(`[DEBUG] DM Room ${roomIdToLeave} is empty. Not deleting from DB.`);
                // DM rooms are not deleted from DB when empty, they persist for chat history.
            }
        } else { // Room still has participants
            // Check if the leaving user was the host
            const roomDbResult = await db.query('SELECT host_id, room_type, is_private FROM rooms WHERE id = $1', [roomIdToLeave]);
            const currentHostId = roomDbResult.rows[0]?.host_id;

            if (currentHostId === userIdToLeave) {
                // Host is leaving, elect a new host
                const remainingParticipants = Array.from(room);
                if (remainingParticipants.length > 0) {
                    const newHostWs = remainingParticipants[0]; // Elect the first remaining participant
                    const newHostId = newHostWs.userId;

                    // Update host in DB
                    await db.query('UPDATE rooms SET host_id = $1 WHERE id = $2', [newHostId, roomIdToLeave]);
                    console.log(`[DEBUG] Room ${roomIdToLeave}: Host changed from ${userIdToLeave} to ${newHostId}.`);

                    // Notify all remaining clients in the room about the new host
                    room.forEach(client => {
                        if (client.readyState === WebSocket.OPEN) {
                            send(client, 'host-changed', { roomId: roomIdToLeave, newHostId });
                        }
                    });

                    // Update lobby with new host info
                    const newHost = await getUserDetails(newHostId);
                    if (roomType === 'group' && newHost) {
                        broadcastToLobby(wss, 'room-updated', { roomId: roomIdToLeave, hostId: newHostId, hostName: newHost.username, participantCount: room.size, roomType, isPrivate });
                    }

                } else {
                    // This case should ideally be handled by room.size === 0, but as a fallback
                    console.log(`[DEBUG] Room ${roomIdToLeave} is empty after host left. Deleting.`);
                    rooms.delete(roomIdToLeave);
                    if (roomType === 'group') {
                        try {
                            await db.query('DELETE FROM rooms WHERE id = $1', [roomIdToLeave]);
                            broadcastToLobby(wss, 'room-deleted', { roomId: roomIdToLeave });
                        } catch (error) {
                            console.error(`[DEBUG] Failed to delete room ${roomIdToLeave} from database after host left:`, error);
                        }
                    }
                }
            } else {
                console.log(`[DEBUG] User ${userIdToLeave} left room ${roomIdToLeave}. Not host. Room still has participants: ${room.size}.`);
                // Only update participant count in lobby if non-host leaves
                if (roomType === 'group') {
                    broadcastToLobby(wss, 'room-updated', { roomId: roomIdToLeave, participantCount: room.size, roomType, isPrivate });
                }
            }
        }
    }
    // Note: Clearing ws.roomId and userRoomMap is now handled inside the `if (room)` block.
}

async function handleChatMessage(ws, payload, wss, rooms) {
    const { roomId, userId, content } = payload; // Changed 'message' to 'content'
    if (!roomId || !userId || !content) return;

    try {
        // 1. Save message to DB
        const result = await db.query(
            'INSERT INTO chat_messages (room_id, user_id, content) VALUES ($1, $2, $3) RETURNING id, created_at, is_edited, deleted_at', // Changed 'message' to 'content', added returning fields
            [roomId, userId, content]
        );
        const { id: messageId, created_at: timestamp, is_edited: isEdited, deleted_at: deletedAt } = result.rows[0];

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
                        profile_image_url: sender.profile_image_url ? `http://localhost:3001${sender.profile_image_url}` : null,
                        content,
                        timestamp,
                        isEdited,
                        deletedAt,
                    });
                }
            });
        }
    } catch (error) {
        console.error('Failed to save or broadcast chat message:', error);
    }
}

function handleWebRTCSignaling(ws, data, wss, rooms) {
    const { type, payload } = data;
    const { targetUserId, ...signalingData } = payload;
    const senderId = ws.userId;

    if (!targetUserId || !senderId) {
        console.error('[WebRTC Signaling] Error: targetUserId or senderId is missing.', { targetUserId, senderId });
        return;
    }

    let targetClient = null;
    for (const client of wss.clients) {
        // --- DETAILED DEBUG LOG ---
        console.log(`[WebRTC Signaling] Searching... Target: ${targetUserId} (type: ${typeof targetUserId}), Checking client: ${client.userId} (type: ${typeof client.userId}) in room: ${client.roomId}`);
        // --- END DEBUG LOG ---

        // Ensure both are treated as the same type for comparison
        if (String(client.userId) === String(targetUserId) && String(client.roomId) === String(ws.roomId)) {
            targetClient = client;
            break;
        }
    }

    if (targetClient && targetClient.readyState === WebSocket.OPEN) {
        console.log(`[WebRTC Signaling] Success: Found target ${targetUserId}. Relaying ${type} from ${senderId}.`);
        send(targetClient, type, { ...signalingData, senderId });
    } else {
        console.warn(`[WebRTC Signaling] Failure: Target client ${targetUserId} not found or not open in room ${ws.roomId}.`);
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
                cm.content, -- Changed from cm.message
                cm.is_edited AS "isEdited",
                cm.created_at AS "timestamp",
                cm.updated_at AS "updatedAt",
                cm.deleted_at AS "deletedAt"
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
        const chatHistory = result.rows.map(row => ({
            ...row,
            profileImageUrl: row.profileImageUrl ? `http://localhost:3001${row.profileImageUrl}` : null,
        })).reverse(); // Reverse to get oldest first

        send(ws, 'chat-history', { roomId, messages: chatHistory });

    } catch (error) {
        console.error('Failed to fetch chat history:', error);
        send(ws, 'error', { message: 'Failed to fetch chat history.' });
    }
}

async function handleDeleteMessage(ws, payload, wss, rooms) {
    const { messageId } = payload;
    const { userId, roomId } = ws;

    if (!messageId || !userId || !roomId) {
        return send(ws, 'error', { message: 'Invalid request for message deletion.' });
    }

    try {
        // 1. Verify that the user requesting deletion is the author of the message
        const messageResult = await db.query('SELECT user_id FROM chat_messages WHERE id = $1', [messageId]);
        if (messageResult.rows.length === 0) {
            return send(ws, 'error', { message: 'Message not found.' });
        }
        if (messageResult.rows[0].user_id !== userId) {
            return send(ws, 'error', { message: 'You do not have permission to delete this message.' });
        }

        // 2. Perform the soft delete by updating the deleted_at timestamp
        await db.query('UPDATE chat_messages SET deleted_at = NOW() WHERE id = $1', [messageId]);

        // 3. Broadcast the deletion to all clients in the room
        const room = rooms.get(roomId);
        if (room) {
            const broadcastPayload = { roomId, messageId };
            room.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    send(client, 'message-deleted', broadcastPayload);
                }
            });
        }
        console.log(`Message ${messageId} in room ${roomId} soft-deleted by user ${userId}.`);

    } catch (error) {
        console.error(`Failed to soft-delete message ${messageId}:`, error);
        send(ws, 'error', { message: 'Failed to delete message.' });
    }
}

async function handleMuteStatusChanged(ws, payload, wss, rooms) {
    const { userId, isMuted, targetUserId } = payload;
    const senderId = ws.userId;
    const { roomId } = ws;

    if (!roomId || userId === undefined || isMuted === undefined) {
        return; // Invalid payload
    }

    // If a targetUserId is specified, send only to that user.
    if (targetUserId) {
        for (const client of wss.clients) {
            if (String(client.userId) === String(targetUserId) && String(client.roomId) === String(roomId)) {
                send(client, 'mute-status-changed', { userId, isMuted, senderId });
                break;
            }
        }
    } else {
        // Otherwise, broadcast to the entire room.
        const room = rooms.get(roomId);
        if (room) {
            room.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    send(client, 'mute-status-changed', { userId, isMuted, senderId });
                }
            });
        }
    }
}

// This message is sent by the client but requires no server-side action.
// We add an empty handler to prevent "No handler found" errors.
function handleStreamIdMap() {
    // Do nothing.
}
module.exports = {
    handleGetRooms,
    handleCreateRoom,
    handleJoinRoom,
    handleLeaveRoom,
    handleChatMessage,
    handleWebRTCSignaling,
    handleGetChatHistory, // Export the new handler
    handleDeleteMessage,
    handleGetCategories,
    handleMuteStatusChanged,
    handleStreamIdMap,
};
