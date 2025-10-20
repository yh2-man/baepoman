require('dotenv').config();

const initDb = require('./src/db/initDb.js');
const startSignaling = require('./src/signaling-server.js');

async function startServer() {
    try {
        console.log('Starting database initialization...');
        await initDb();
        console.log('Database successfully prepared.');

        console.log('Starting servers...');

        startSignaling();

        console.log('All servers started successfully.');
    } catch (err) {
        console.error('Error starting server:', err);
        process.exit(1);
    }
}

startServer();