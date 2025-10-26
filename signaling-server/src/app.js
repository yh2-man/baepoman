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

// --- HTTP Routes ---
const profileRoutes = require('./routes/profile.js');
app.use('/api', profileRoutes);

module.exports = app;
