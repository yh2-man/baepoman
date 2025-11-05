require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const dbConfig = {
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    password: process.env.DB_PASSWORD || 'gkak1021',
    port: process.env.DB_PORT || 5432,
};

const targetDatabase = process.env.DB_NAME || 'voice_chat';

async function initDb() {
    let DB = new Client({...dbConfig, database: 'postgres' });
    try {
        await DB.connect();
        console.log("Connected to default 'postgres' database.");

        const res = await DB.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [targetDatabase]);
        
        if (res.rowCount === 0) {
            console.log(`'${targetDatabase}' database not found. Creating new one.`);
            await DB.query(`CREATE DATABASE "${targetDatabase}"`);
            console.log(`'${targetDatabase}' database created successfully.`);
            await initTable();
        } else {
            console.log(`'${targetDatabase}' database already exists.`);
        }
    } catch (err) {
        console.error('Error checking/creating database:', err);
        process.exit(1);
    } finally {
        await DB.end();
        console.log(`Connection to '${targetDatabase}' database closed.`);
    }    
}

async function initTable() {
    let Table = new Client({ ... dbConfig, database: targetDatabase });

    try {
        await Table.connect();
        console.log(`Connecting to '${targetDatabase}' database to create tables...`);
        const schemaPath = path.join(__dirname, 'Schema.sql');
        const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
        await Table.query(schemaSQL);
        console.log('Tables successfully prepared.');
        console.log('All database initialization completed.');
    } catch (err) {
        console.error('Error creating tables:', err);
        process.exit(1);
    }finally {
        await Table.end();
        console.log(`Connection to '${targetDatabase}' database closed.`);
    }
}

module.exports = initDb;

// If this script is run directly, execute the initDb function
if (require.main === module) {
    initDb();
}