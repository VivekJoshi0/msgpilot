const path = require('path');
const fs = require('fs');

const clients = new Map();

// Set up base auth directory from env or fallback
const AUTH_BASE_PATH = process.env.AUTH_PATH || path.join(__dirname, 'auth');

// Ensure base folder exists
if (!fs.existsSync(AUTH_BASE_PATH)) {
    fs.mkdirSync(AUTH_BASE_PATH, { recursive: true });
    console.log(`📁 Created session base path: ${AUTH_BASE_PATH}`);
}

const getAuthFolderPath = (userId) => path.join(AUTH_BASE_PATH, userId);

module.exports = {
    clients,
    getAuthFolderPath
};
