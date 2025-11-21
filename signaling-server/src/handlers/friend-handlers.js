const db = require('../db/Db');
const WebSocket = require('ws');
const { getUserDetails } = require('../utils/db-helpers');

/**
 * Finds a user's WebSocket connection from the server's client list.
 * @param {WebSocketServer} wss - The WebSocket server instance.
 * @param {number} userId - The ID of the user to find.
 * @returns {WebSocket|null} The WebSocket connection or null if not found.
 */
function findUserConnection(wss, userId) {
    for (const client of wss.clients) {
        if (client.userId === userId && client.readyState === WebSocket.OPEN) {
            return client;
        }
    }
    return null;
}

/**
 * Fetches the initial list of friends and pending requests for the user.
 * @param {WebSocket} ws - The WebSocket connection of the user.
 */
async function handleGetFriendsList(ws) {
    const userId = ws.userId;
    if (!userId) {
        return ws.send(JSON.stringify({ type: 'friends-list-failure', payload: { message: '인증되지 않은 사용자입니다.' } }));
    }

    try {
        const query = `
            SELECT
                f.user_id_1,
                u1.username AS username1,
                u1.tag AS tag1,
                u1.profile_image_url AS profile_image_url1,
                f.user_id_2,
                u2.username AS username2,
                u2.tag AS tag2,
                u2.profile_image_url AS profile_image_url2,
                f.status,
                f.requested_by
            FROM friendships f
            JOIN users u1 ON f.user_id_1 = u1.id
            JOIN users u2 ON f.user_id_2 = u2.id
            WHERE f.user_id_1 = $1 OR f.user_id_2 = $1;
        `;
        const { rows } = await db.query(query, [userId]);

        const friends = {
            accepted: [],
            pending: {
                incoming: [],
                outgoing: [],
            },
            blocked: [],
        };

        rows.forEach(row => {
            const otherUser = row.user_id_1 === userId ? {
                id: row.user_id_2,
                username: row.username2,
                tag: row.tag2,
                profile_image_url: row.profile_image_url2, // Pass relative path directly
            } : {
                id: row.user_id_1,
                username: row.username1,
                tag: row.tag1,
                profile_image_url: row.profile_image_url1, // Pass relative path directly
            };

            switch (row.status) {
                case 'accepted':
                    friends.accepted.push(otherUser);
                    break;
                case 'pending':
                    if (row.requested_by === userId) {
                        friends.pending.outgoing.push(otherUser);
                    } else {
                        friends.pending.incoming.push(otherUser);
                    }
                    break;
                case 'blocked':
                    if (row.requested_by === userId) {
                        friends.blocked.push(otherUser);
                    }
                    break;
            }
        });

        ws.send(JSON.stringify({
            type: 'friends-list-success',
            payload: friends,
        }));

    } catch (error) {
        console.error('Error fetching friends list:', error);
        ws.send(JSON.stringify({ type: 'friends-list-failure', payload: { message: '친구 목록을 불러오는 중 오류가 발생했습니다.' } }));
    }
}


/**
 * Handles a new friend request.
 * @param {WebSocket} ws - The WebSocket connection of the user sending the request.
 * @param {object} payload - The message payload.
 * @param {string} payload.fullTag - The full tag (username#tag) of the user to add.
 * @param {WebSocketServer} wss - The WebSocket server instance.
 */
async function handleFriendRequest(ws, { fullTag }, wss) {
    const requesterId = ws.userId;
    if (!requesterId) {
        return ws.send(JSON.stringify({ type: 'friend-request-failure', payload: { message: '인증되지 않은 사용자입니다.' } }));
    }

    if (!fullTag || !fullTag.includes('#')) {
        return ws.send(JSON.stringify({ type: 'friend-request-failure', payload: { message: '올바른 형식이 아닙니다 (예: username#1234).' } }));
    }

    const parts = fullTag.split('#');
    const username = parts[0];
    const tag = parts[1];

    if (!username || !/^\d{4}$/.test(tag)) {
        return ws.send(JSON.stringify({ type: 'friend-request-failure', payload: { message: '올바른 형식이 아닙니다 (예: username#1234).' } }));
    }

    try {
        // Find the target user
        const { rows: users } = await db.query('SELECT id, username, tag, profile_image_url FROM users WHERE username = $1 AND tag = $2', [username, tag]);
        if (users.length === 0) {
            return ws.send(JSON.stringify({ type: 'friend-request-failure', payload: { message: '해당 사용자를 찾을 수 없습니다.' } }));
        }
        const targetUser = users[0];

        if (targetUser.id === requesterId) {
            return ws.send(JSON.stringify({ type: 'friend-request-failure', payload: { message: '자기 자신에게 친구 요청을 보낼 수 없습니다.' } }));
        }

        // Check if a relationship already exists
        const user1 = Math.min(requesterId, targetUser.id);
        const user2 = Math.max(requesterId, targetUser.id);

        const { rows: existingFriendship } = await db.query(
            'SELECT status FROM friendships WHERE user_id_1 = $1 AND user_id_2 = $2',
            [user1, user2]
        );

        if (existingFriendship.length > 0) {
            const status = existingFriendship[0].status;
            if (status === 'accepted') {
                return ws.send(JSON.stringify({ type: 'friend-request-failure', payload: { message: '이미 친구입니다.' } }));
            } else if (status === 'pending') {
                return ws.send(JSON.stringify({ type: 'friend-request-failure', payload: { message: '이미 친구 요청을 보냈거나 받았습니다.' } }));
            } else if (status === 'blocked') {
                 return ws.send(JSON.stringify({ type: 'friend-request-failure', payload: { message: '차단했거나 차단된 사용자입니다.' } }));
            }
        }

        // Create new pending friendship
        await db.query(
            'INSERT INTO friendships (user_id_1, user_id_2, status, requested_by) VALUES ($1, $2, $3, $4)',
            [user1, user2, 'pending', requesterId]
        );

        ws.send(JSON.stringify({ type: 'friend-request-success', payload: { message: '친구 요청을 보냈습니다.' } }));

        // Notify the target user if they are online
        const targetSocket = findUserConnection(wss, targetUser.id);
        if (targetSocket) {
            const requester = await getUserDetails(requesterId);
            targetSocket.send(JSON.stringify({
                type: 'friend-request-received',
                payload: requester
            }));
        }

    } catch (error) {
        console.error('Error handling friend request:', error);
        ws.send(JSON.stringify({ type: 'friend-request-failure', payload: { message: '친구 요청 중 오류가 발생했습니다.' } }));
    }
}

/**
 * Handles accepting a friend request.
 * @param {WebSocket} ws - The WebSocket connection of the user accepting the request.
 * @param {object} payload - The message payload.
 * @param {number} payload.requesterId - The ID of the user who sent the request.
 * @param {WebSocketServer} wss - The WebSocket server instance.
 */
async function handleAcceptFriendRequest(ws, { requesterId }, wss) {
    const accepterId = ws.userId;
    if (!accepterId) {
        return ws.send(JSON.stringify({ type: 'friend-accept-failure', payload: { message: '인증되지 않은 사용자입니다.' } }));
    }

    try {
        const user1 = Math.min(requesterId, accepterId);
        const user2 = Math.max(requesterId, accepterId);

        // Verify the request is pending and was made by the other user
        const { rows: pendingRequest } = await db.query(
            'SELECT * FROM friendships WHERE user_id_1 = $1 AND user_id_2 = $2 AND status = $3 AND requested_by = $4',
            [user1, user2, 'pending', requesterId]
        );

        if (pendingRequest.length === 0) {
            return ws.send(JSON.stringify({ type: 'friend-accept-failure', payload: { message: '유효하지 않은 친구 요청입니다.' } }));
        }

        // Update the friendship status to 'accepted'
        await db.query(
            'UPDATE friendships SET status = $1, updated_at = NOW() WHERE user_id_1 = $2 AND user_id_2 = $3',
            ['accepted', user1, user2]
        );

        // --- Notify both users ---
        const requesterUserObject = await getUserDetails(requesterId);
        const accepterUserObject = await getUserDetails(accepterId);
        
        const requesterSocket = findUserConnection(wss, requesterId);

        // Notify original requester
        if (requesterSocket) {
            requesterSocket.send(JSON.stringify({
                type: 'friend-update',
                payload: { status: 'accepted', user: accepterUserObject }
            }));
        }

        // Notify accepter (the current user)
        ws.send(JSON.stringify({
            type: 'friend-update',
            payload: { status: 'accepted', user: requesterUserObject }
        }));

    } catch (error) {
        console.error('Error accepting friend request:', error);
        ws.send(JSON.stringify({ type: 'friend-accept-failure', payload: { message: '친구 요청 수락 중 오류가 발생했습니다.' } }));
    }
}


/**
 * Handles declining a friend request or canceling an outgoing one.
 * @param {WebSocket} ws - The WebSocket connection of the user.
 * @param {object} payload - The message payload.
 * @param {number} payload.otherUserId - The ID of the other user in the pending request.
 */
async function handleDeclineFriendRequest(ws, { otherUserId }) {
    const currentUserId = ws.userId;
    if (!currentUserId) {
        return ws.send(JSON.stringify({ type: 'friend-decline-failure', payload: { message: '인증되지 않은 사용자입니다.' } }));
    }

    try {
        const user1 = Math.min(otherUserId, currentUserId);
        const user2 = Math.max(otherUserId, currentUserId);

        // Just delete the pending request, regardless of who sent it.
        const result = await db.query(
            'DELETE FROM friendships WHERE user_id_1 = $1 AND user_id_2 = $2 AND status = $3',
            [user1, user2, 'pending']
        );

        if (result.rowCount > 0) {
            ws.send(JSON.stringify({ type: 'friend-decline-success', payload: { declinedUserId: otherUserId } }));
        } else {
            // This can happen if the other user cancelled the request in the meantime.
            ws.send(JSON.stringify({ type: 'friend-decline-failure', payload: { message: '해당 친구 요청을 찾을 수 없습니다.' } }));
        }

    } catch (error) {
        console.error('Error declining friend request:', error);
        ws.send(JSON.stringify({ type: 'friend-decline-failure', payload: { message: '친구 요청 거절 중 오류가 발생했습니다.' } }));
    }
}

/**
 * Handles removing a friend.
 * @param {WebSocket} ws - The WebSocket connection of the user removing a friend.
 * @param {object} payload - The message payload.
 * @param {number} payload.friendId - The ID of the friend to remove.
 * @param {WebSocketServer} wss - The WebSocket server instance.
 */
async function handleRemoveFriend(ws, { friendId }, wss) {
    const removerId = ws.userId;
    if (!removerId) {
        return ws.send(JSON.stringify({ type: 'friend-remove-failure', payload: { message: '인증되지 않은 사용자입니다.' } }));
    }

    try {
        const user1 = Math.min(friendId, removerId);
        const user2 = Math.max(friendId, removerId);

        // Delete the 'accepted' friendship
        const result = await db.query(
            'DELETE FROM friendships WHERE user_id_1 = $1 AND user_id_2 = $2 AND status = $3',
            [user1, user2, 'accepted']
        );

        if (result.rowCount > 0) {
            // Notify remover
            ws.send(JSON.stringify({ type: 'friend-removed', payload: { removedFriendId: friendId } }));

            // Notify the other user if they are online
            const friendSocket = findUserConnection(wss, friendId);
            if (friendSocket) {
                friendSocket.send(JSON.stringify({ type: 'friend-removed', payload: { removedFriendId: removerId } }));
            }
        } else {
            ws.send(JSON.stringify({ type: 'friend-remove-failure', payload: { message: '해당 친구 관계를 찾을 수 없습니다.' } }));
        }

    } catch (error) {
        console.error('Error removing friend:', error);
        ws.send(JSON.stringify({ type: 'friend-remove-failure', payload: { message: '친구 삭제 중 오류가 발생했습니다.' } }));
    }
}

/**
 * Handles sending a direct message to a friend.
 * @param {WebSocket} ws - The WebSocket connection of the user sending the message.
 * @param {object} payload - The message payload.
 * @param {number} payload.receiverId - The ID of the user to receive the message.
 * @param {string} payload.content - The message content.
 * @param {WebSocketServer} wss - The WebSocket server instance.
 */
async function handleDirectMessage(ws, { receiverId, content }, wss) {
    const senderId = ws.userId;
    if (!senderId) {
        return ws.send(JSON.stringify({ type: 'direct-message-failure', payload: { message: '인증되지 않은 사용자입니다.' } }));
    }

    if (!content || content.trim().length === 0) {
        return ws.send(JSON.stringify({ type: 'direct-message-failure', payload: { message: '메시지 내용이 없습니다.' } }));
    }

    try {
        // Verify that the two users are friends
        const user1 = Math.min(senderId, receiverId);
        const user2 = Math.max(senderId, receiverId);
        const { rows: friendship } = await db.query(
            'SELECT status FROM friendships WHERE user_id_1 = $1 AND user_id_2 = $2',
            [user1, user2]
        );

        if (friendship.length === 0 || friendship[0].status !== 'accepted') {
            return ws.send(JSON.stringify({ type: 'direct-message-failure', payload: { message: '친구 관계가 아니므로 메시지를 보낼 수 없습니다.' } }));
        }

        // Insert the message into the database
        const { rows: newMessages } = await db.query(
            'INSERT INTO direct_messages (sender_id, receiver_id, content) VALUES ($1, $2, $3) RETURNING *',
            [senderId, receiverId, content.trim()]
        );
        const newMessage = newMessages[0];

        // Send the message to the receiver if they are online
        const receiverSocket = findUserConnection(wss, receiverId);
        if (receiverSocket) {
            receiverSocket.send(JSON.stringify({
                type: 'direct-message-received',
                payload: newMessage,
            }));
        }

        // Confirm message sending to the sender
        ws.send(JSON.stringify({
            type: 'direct-message-sent',
            payload: newMessage,
        }));

    } catch (error) {
        console.error('Error sending direct message:', error);
        ws.send(JSON.stringify({ type: 'direct-message-failure', payload: { message: '메시지 전송 중 오류가 발생했습니다.' } }));
    }
}

async function handleGetDmHistory(ws, { friendId }) {
    const userId = ws.userId;
    if (!userId || !friendId) {
        return ws.send(JSON.stringify({ type: 'dm-history-failure', payload: { message: 'Invalid request for DM history.' } }));
    }

    try {
        const user1 = Math.min(userId, friendId);
        const user2 = Math.max(userId, friendId);

        const query = `
            SELECT id, sender_id, receiver_id, content, created_at
            FROM direct_messages
            WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1)
            ORDER BY created_at ASC;
        `;
        const { rows } = await db.query(query, [user1, user2]);

        ws.send(JSON.stringify({
            type: 'dm-history-success',
            payload: {
                friendId: friendId,
                messages: rows,
            },
        }));

    } catch (error) {
        console.error('Error fetching DM history:', error);
        ws.send(JSON.stringify({ type: 'dm-history-failure', payload: { message: 'Error fetching message history.' } }));
    }
}

module.exports = {
    handleFriendRequest,
    handleAcceptFriendRequest,
    handleDeclineFriendRequest,
    handleRemoveFriend,
    handleGetFriendsList,
    handleDirectMessage,
    handleGetDmHistory,
};
