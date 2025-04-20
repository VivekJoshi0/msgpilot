const { initializeWhatsAppClient, isSessionActive, cleanupClient } = require('../config/client');

const initClient = async (req, res) => {
    const userId = req.user?.id;
    const active = await isSessionActive(userId);
    const io = req.app.get('io');

    console.log(`✅ UserID: ${userId}`);


    if (active) {
        console.log('✅ Already Session On');
        io.to(userId).emit('whatsapp:connected');
        return res.status(200).json({ message: 'WhatsApp Client already initialized' });
    }

    try {
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
    const active = await isSessionActive(userId);

    if (!active) {
        return res.status(200).json({ message: 'Client already logged out' });
    }

    try {
        await cleanupClient(userId);
        res.status(200).json({ message: 'Logged out successfully' });
    } catch (error) {
        console.error('❌ Logout error:', error);
        res.status(500).json({ message: 'Failed to logout client' });
    }
};

// Cancel initialization process and cleanup
const cancelClientInit = async (req, res) => {
    const userId = req.user?.id;
    if (!userId) {
        return res.status(400).json({ message: 'User not authenticated' });
    }

    try {
        await cleanupClient(userId);
        console.log(`⚠️ WhatsApp initialization cancelled for user: ${userId}`);
        res.status(200).json({ message: 'WhatsApp client initialization cancelled' });
    } catch (error) {
        console.error('❌ Cancel Init error:', error);
        res.status(500).json({ message: 'Failed to cancel client initialization' });
    }
};

module.exports = {
    initClient,
    getClientSessionStatus,
    logoutClient,
    cancelClientInit
};
