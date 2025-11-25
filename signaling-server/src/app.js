const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// --- Create uploads directory if it doesn't exist ---
const uploadsDir = path.join(__dirname, '..', 'uploads', 'profiles');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Serve profile images statically
app.use('/uploads/profiles', express.static(uploadsDir));

const profileRoutes = require('./routes/profile.js');

app.use('/api', profileRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('Unhandled Error:', err);
    if (res.headersSent) {
        return next(err);
    }
    res.status(500).json({ message: err.message || 'Internal Server Error' });
});

module.exports = app;
