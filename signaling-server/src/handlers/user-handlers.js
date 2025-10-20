const db = require('../db/Db');

async function handleGetUserProfile(ws, payload) {
    const { userId } = payload;
    if (!userId) return;

    try {
        const result = await db.query(
            'SELECT id, username, profile_image_url FROM users WHERE id = $1',
            [userId]
        );

        if (result.rows.length > 0) {
            ws.send(JSON.stringify({ type: 'user-profile-data', payload: { user: result.rows[0] } }));
        } else {
            // Optional: send a not-found response
            ws.send(JSON.stringify({ type: 'user-profile-data', payload: { user: null, userId } }));
        }
    } catch (error) {
        console.error(`Error fetching profile for user ${userId}:`, error);
        // Optional: send an error response
    }
}

module.exports = { handleGetUserProfile };
