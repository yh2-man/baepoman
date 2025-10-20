const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer <TOKEN>

    if (token == null) {
        return res.sendStatus(401); // Unauthorized
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.sendStatus(403); // Forbidden (token is no longer valid)
        }
        req.user = user; // Attach user payload (e.g., { id, username }) to the request
        next();
    });
}

module.exports = authenticateToken;
