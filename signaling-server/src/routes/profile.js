const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const db = require('../db/Db');
const authenticateToken = require('../middleware/authenticateToken'); // Import middleware
const { notifyFriends, findUserConnection } = require('../handlers/friend-handlers'); // Import notifyFriends and findUserConnection

const router = express.Router();

// Multer Configuration
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const uploadsDir = path.join(__dirname, '..', '..', 'uploads', 'profiles');

// --- Route Definition ---
// This endpoint is now protected by the authenticateToken middleware.
router.post('/upload/profile-image', authenticateToken, upload.single('profileImage'), async (req, res) => {
    // The user ID is now securely obtained from the validated token
    const userId = req.user.id;
    const wss = req.app.get('wss'); // Get the WebSocket server instance from app locals


    if (!req.file) {
        return res.status(400).json({ message: 'Profile image file is required.' });
    }

    try {
        const filename = `${userId}.webp`;
        const outputPath = path.join(uploadsDir, filename);

        // Process image with sharp
        await sharp(req.file.buffer)
            .resize(200, 200)
            .webp({ quality: 80 })
            .toFile(outputPath);

        const fileUrl = `/uploads/profiles/${filename}`;

        // Update the user's profile_image_url in the database
        const result = await db.query(
            'UPDATE users SET profile_image_url = $1 WHERE id = $2 RETURNING profile_image_url',
            [fileUrl, userId]
        );

        if (result.rows.length === 0) {
            // This case should be rare now since the token guarantees the user exists
            return res.status(404).json({ message: 'User not found.' });
        }

        const newImageUrl = result.rows[0].profile_image_url;

        res.status(200).json({ imageUrl: newImageUrl });

        // Notify friends about the profile image change
        if (wss) {
            const updatedUserResult = await db.query(
                'SELECT id, username, tag, profile_image_url, last_seen_at FROM users WHERE id = $1',
                [userId]
            );
            if (updatedUserResult.rows.length > 0) {
                notifyFriends(wss, userId, updatedUserResult.rows[0]);
            }
        }

    } catch (error) {
        console.error('Error uploading profile image:', error);
        res.status(500).json({ message: 'An error occurred while processing the image.' });
    }
});

// GET /api/me - Fetches the current user's profile
router.get('/me', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await db.query(
            'SELECT id, username, email, profile_image_url, last_seen_at, tag FROM users WHERE id = $1',
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'User not found.' });
        }

        const user = result.rows[0];
        
        res.json(user);

    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({ message: 'Error fetching user profile.' });
    }
});

module.exports = router;