const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const clients = new Map(); // 🧠 Per-user clients

const log = {
    info: (...args) => console.log('ℹ️', ...args),
    warn: (...args) => console.warn('⚠️', ...args),
    error: (...args) => console.error('❌', ...args),
};

const initializeWhatsAppClient = async (userId, io) => {
    if (clients.has(userId)) {
        try {
            const existingClient = clients.get(userId);
            const state = await existingClient.getState();
            if (state === 'CONNECTED') {
                log.info(`User ${userId} already connected.`);
                io.to(userId).emit('whatsapp:connected');
                return;
            }
        } catch (err) {
            log.warn(`Client error for ${userId}. Cleaning up...`);
            await cleanupClient(userId);
        }
    }

    try {
        io.to(userId).emit('whatsapp:initializing'); 
        const executablePath = puppeteer.executablePath();

        const client = new Client({
            authStrategy: new LocalAuth({ clientId: userId }), // 🔑 Isolate by userId
            puppeteer: {
                headless: true,
                executablePath,
                args: ['--no-sandbox', '--disable-setuid-sandbox'],
            },
        });

        setupWhatsAppEventHandlers(client, userId, io);
        clients.set(userId, client); // 💾 Store client instance
        await client.initialize();

        log.info(`🚀 WhatsApp client initialized for user: ${userId}`);
    } catch (err) {
        log.error(`❌ Initialization error for ${userId}:`, err);
        await cleanupClient(userId);
    }
};

const setupWhatsAppEventHandlers = (client, userId, io) => {
    if (!client) return;

    client.on('qr', (qr) => {
        log.info(`📱 Scan QR for user ${userId}:`);
        qrcode.generate(qr, { small: true });
        io.to(userId).emit('whatsapp:qr', qr); 
    });

    client.on('ready', () => {
        log.info(`✅ Client ready for user ${userId}`);
        io.to(userId).emit('whatsapp:ready');
    });

    client.on('auth_failure', (msg) => {
        log.warn(`Auth failure for user ${userId}:`, msg);
        io.to(userId).emit('whatsapp:auth_failure', msg);
    });

    client.on('disconnected', async (reason) => {
        log.warn(`Client ${userId} disconnected:`, reason);
        await cleanupClient(userId);
    });

    client.on('error', (error) => {
        log.error(`Error in client ${userId}:`, error);
        io.to(userId).emit('whatsapp:error', error);
    });
};

const isSessionActive = async (userId) => {
    const client = clients.get(userId);
    if (!client) return false;

    try {
        const state = await client.getState();
        return state === 'CONNECTED';
    } catch (err) {
        log.warn(`isSessionActive() error for ${userId}:`, err.message);
        return false;
    }
};

const cleanupClient = async (userId) => {
    const client = clients.get(userId);
    log.info(`🧹 Destroying client for user ${client}`);
    if (client) {
        try {
            log.info(`🧹 Destroying client for user ${userId}`);
            await client.destroy();
        } catch (err) {
            log.warn(`Error destroying client ${userId}:`, err.message);
        }
        clients.delete(userId);
    }

    // 🔥 Remove user-specific session folder
    const sessionPath = path.join(process.cwd(), '.wwebjs_auth', `session-${userId}`);
    try {
        if (fs.existsSync(sessionPath)) {
            fs.rmSync(sessionPath, { recursive: true, force: true });
            log.info(`🧹 Deleted session folder for user ${userId}`);
        }
    } catch (err) {
        log.warn(`Failed to delete session folder for ${userId}:`, err.message);
    }

    // Optionally delete user-specific cache
    const cachePath = path.join(process.cwd(), '.wwebjs_cache', `${userId}`);
    try {
        if (fs.existsSync(cachePath)) {
            fs.rmSync(cachePath, { recursive: true, force: true });
            log.info(`🧹 Cleared cache for user ${userId}`);
        }
    } catch (err) {
        log.warn(`Cache deletion failed for ${userId}:`, err.message);
    }
};

const getClient = (userId) => clients.get(userId);

module.exports = {
    initializeWhatsAppClient,
    isSessionActive,
    cleanupClient,
    getClient,
};
