/**
 * Middleware to ensure a user is authenticated before processing a message.
 * It checks for the presence of `userId` on the WebSocket connection object.
 * @param {function} handler - The message handler to wrap.
 * @returns {function} A new handler function that includes the authentication check.
 */
const authenticateToken = (handler) => {
    return (ws, payload, ...args) => {
        if (!ws.userId) {
            // If user is not authenticated, send an error and do not proceed.
            return ws.send(JSON.stringify({
                type: 'auth-error',
                payload: { message: '인증이 필요합니다.' }
            }));
        }
        // If authenticated, call the original handler with all its arguments.
        return handler(ws, payload, ...args);
    };
};

module.exports = authenticateToken;