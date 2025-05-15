// config/clientManager.js

const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode');
const timeoutManager = require('../utils/timeoutManager');
const fs = require('fs');
const path = require('path');
const pino = require('pino');

const { isDisconnecting } = require('./disconnectState');

const clients = new Map();

const initializeWhatsAppClient = async (userId, io) => {
    const authFolder = path.join(__dirname, 'auth', userId);
    const { state, saveCreds } = await useMultiFileAuthState(authFolder);
    io.to(userId).emit('whatsapp:initializing');

    const sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'error' }),
        printQRInTerminal: true,
    });

    clients.set(userId, sock);

    sock.ev.on('connection.update', async (update) => {
        const { connection, qr, lastDisconnect } = update;

        if (qr) {
            const timeoutValue = 30 * 1000;

            timeoutManager.set(userId, async () => {
                console.log(`⌛ QR Timeout for user ${userId}`);
                await cleanupClient(userId);
                io.to(userId).emit('whatsapp:timeout');
            }, timeoutValue);

            qrcode.toDataURL(qr, (err, url) => {
                if (!err) {
                    io.to(userId).emit('whatsapp:qr', {
                        qrCode: qr,
                        qrImage: url,
                        timeoutValue: timeoutValue
                    });
                }
            });
        }

        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            const isLoggedOut = statusCode === DisconnectReason.loggedOut;

            console.log(`🔌 Connection closed for ${userId} (status: ${statusCode})`);
            timeoutManager.clear(userId); // 🧹 Always clear timeout

            if (!isLoggedOut && !isDisconnecting(userId)) {
                console.log('⏳ Waiting 2 seconds before reconnecting...');
                setTimeout(() => {
                    try {
                        initializeWhatsAppClient(userId, io);
                    } catch (e) {
                        console.error('Reconnect failed:', e);
                    }
                }, 2000);  // wait 2s to avoid server rejecting too fast
            } else {
                console.log(`🚪 User ${userId} is logged out. Cleaning up.`);
                try {
                    fs.rmSync(authFolder, { recursive: true, force: true });
                } catch (err) {
                    console.error(`Failed to clean auth folder:`, err);
                }
                clients.delete(userId);
                io.to(userId).emit('whatsapp:disconnected');
            }
        }


        if (connection === 'open') {
            console.log(`✅ WhatsApp connected for user ${userId}`);
            timeoutManager.clear(userId); // ✅ Connected, no timeout needed
            io.to(userId).emit('whatsapp:connected');
        }
    });

    sock.ev.on('creds.update', saveCreds);
};

const isSessionActive = (userId) => {
    const client = clients.get(userId);
    console.log('🔍 Checking session for user:', userId, '→', !!client?.user);
    return !!client?.user;
};

const cleanupClient = async (userId) => {
    try {
        if (!userId) {
            console.warn('⚠️ No userId provided for cleanup.');
            return;
        }

        if (!clients.has(userId)) {
            console.info(`ℹ️ No active session found for user: ${userId}`);
            return; // Already cleaned up
        }

        const authFolder = path.join(__dirname, 'auth', userId);
        const client = clients.get(userId);

        if (client) {
            try {
                if (typeof client.logout === 'function') {
                    await client.logout();
                }
            } catch (logoutError) {
                console.warn(`⚠️ Failed to logout client for user ${userId}:`, logoutError);
                // continue with cleanup
            }

            try {
                if (client.ws && typeof client.ws.close === 'function' && client.ws.readyState === 1) {
                    client.ws.close();
                }
            } catch (wsError) {
                console.warn(`⚠️ Failed to close websocket for user ${userId}:`, wsError);
                // continue with cleanup
            }
        }

        try {
            if (fs.existsSync(authFolder)) {
                fs.rmSync(authFolder, { recursive: true, force: true });
            }
        } catch (fsError) {
            console.warn(`⚠️ Failed to remove auth folder for user ${userId}:`, fsError);
            // continue with cleanup
        }

        clients.delete(userId);
        console.log(`🧹 Session cleaned up for user: ${userId}`);

    } catch (err) {
        console.error(`❌ Unexpected error during cleanup for user ${userId}:`, err);
        // Optional: throw if you want the caller to be aware
        throw err;
    }
};


const getClient = (userId) => clients.get(userId);

module.exports = {
    initializeWhatsAppClient,
    getClient,
    isSessionActive,
    cleanupClient
};
