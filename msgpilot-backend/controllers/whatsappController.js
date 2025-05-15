// controllers/whatsappController.js

const { initializeWhatsAppClient, isSessionActive, cleanupClient } = require('../config/clientManager');
const { addDisconnectingClient, removeDisconnectingClient, isDisconnecting } = require('../config/disconnectState');

const initClient = async (req, res) => {
    const userId = req.user?.id;
    const active = await isSessionActive(userId);
    const io = req.app.get('io');

    console.log(`✅ UserID: ${userId}`);

    if (isDisconnecting(userId)) {
        console.log(`⏭️ Skipping reconnect, logout in progress for user ${userId}`);
        return res.status(409).json({ message: 'Logout in progress. Try again later.' });
    }

    if (active) {
        console.log('✅ Already Session On');
        io.to(userId).emit('whatsapp:connected');
        return res.status(200).json({ message: 'WhatsApp Client already initialized' });
    }

    try {
        console.log('✅ Triggering Initialization');
        await initializeWhatsAppClient(userId, io);
        res.status(200).json({ message: 'WhatsApp Client initialization triggered' });
    } catch (error) {
        console.error('❌ Initialization error:', error);
        res.status(500).json({ message: 'Failed to initialize WhatsApp client' });
    }
};

const getClientSessionStatus = async (req, res) => {
    const userId = req.user?.id;
    const active = await isSessionActive(userId);
    if (active) {
        res.status(200).json({ status: true, msg: 'Session active' });
    } else {
        res.status(440).json({ status: false, msg: 'WhatsApp session expired' });
    }
};

const logoutClient = async (req, res) => {
    const userId = req.user?.id;
    if (!userId) {
        return res.status(400).json({ message: 'User not authenticated' });
    }

    if (isDisconnecting(userId)) {
        console.log('⚠️ Logout already in progress');
        return res.status(202).json({ message: 'Logout already in progress' });
    }

    const active = await isSessionActive(userId);
    console.log('🔍 isSessionActive result:', active);

    if (!active) {
        console.log('⚠️ Client already logged out or session invalid');
        return res.status(200).json({ message: 'Client already logged out' });
    }

    addDisconnectingClient(userId);

    try {
        console.log('✅ Logging out the client');
        await cleanupClient(userId);
        res.status(200).json({ message: 'Logged out successfully' });
    } catch (error) {
        console.error('❌ Logout error:', error);
        res.status(500).json({ message: 'Failed to logout client' });
    } finally {
        removeDisconnectingClient(userId);
    }
};

const cancelClientInit = async (req, res) => {
    const userId = req.user?.id;
    if (!userId) {
        return res.status(400).json({ message: 'User not authenticated' });
    }

    if (isDisconnecting(userId)) {
        return res.status(202).json({ message: 'Client logout already in progress' });
    }

    addDisconnectingClient(userId);

    try {
        await cleanupClient(userId);
        console.log(`⚠️ WhatsApp initialization cancelled for user: ${userId}`);
        res.status(200).json({ message: 'WhatsApp client initialization cancelled' });
    } catch (error) {
        console.error('❌ Cancel Init error:', error);
        res.status(500).json({ message: 'Failed to cancel client initialization' });
    } finally {
        removeDisconnectingClient(userId);
    }
};

module.exports = {
    initClient,
    getClientSessionStatus,
    logoutClient,
    cancelClientInit
};
