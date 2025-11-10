const jwt = require('jsonwebtoken');

/**
 * Middleware to ensure a user is authenticated for HTTP requests.
 * It checks for a JWT in the 'Authorization' header.
 * @param {object} req - The Express request object.
 * @param {object} res - The Express response object.
 * @param {function} next - The Express next middleware function.
 */
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer <TOKEN>

    if (token == null) {
        return res.sendStatus(401); // If no token, unauthorized
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.sendStatus(403); // If token is not valid, forbidden
        }
        req.user = user; // Attach user payload to the request
        next(); // Proceed to the next middleware or route handler
    });
};

module.exports = authenticateToken;
