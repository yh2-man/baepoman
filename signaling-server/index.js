require('dotenv').config();
const http = require('http');
const initDb = require('./src/db/initDb.js');
const app = require('./src/app.js'); // Express app
const webSocketServer = require('./src/WebSocketServer.js'); // WebSocket server logic

const PORT = process.env.PORT || 3001;

async function startServer() {
    try {
        // 1. Initialize Database
        console.log('Starting database initialization...');
        await initDb();
        console.log('Database successfully prepared.');

        // 2. Create HTTP Server using Express app
        const server = http.createServer(app);

        // 3. Start WebSocket Server and attach it to the HTTP server
        webSocketServer.start(server);

        // Make wss accessible to routes
        app.set('wss', webSocketServer.wss);

        // 4. Start Listening
        server.listen(PORT, () => {
            console.log(`HTTP and Signaling server running on port ${PORT}.`);
        });

    } catch (err) {
        console.error('Error starting server:', err);
        process.exit(1);
    }
}

startServer();