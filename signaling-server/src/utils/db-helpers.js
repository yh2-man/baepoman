const db = require('../db/Db');

/**
 * Fetches comprehensive details for a user.
 * Automatically formats the profile image URL.
 * @param {number} userId - The ID of the user to fetch.
 * @returns {Promise<object|null>} The user object or null if not found.
 */
async function getUserDetails(userId) {
    if (!userId) return null;
    try {
        const { rows } = await db.query(
            'SELECT id, username, tag, profile_image_url FROM users WHERE id = $1',
            [userId]
        );
        if (rows.length === 0) {
            return null;
        }
        // Return user data with the raw relative path
        return rows[0];
    } catch (error) {
        console.error(`Error fetching details for user ${userId}:`, error);
        return null;
    }
}

module.exports = {
    getUserDetails,
};
