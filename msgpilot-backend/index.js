const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { Server } = require('socket.io');
const { setPaused, setCancelled } = require('./utils/pauseManager');



const authRoutes = require('./routes/authRoutes');
const messageRoutes = require('./routes/messageRoutes');
const whatsappRoutes = require('./routes/whatsappRoutes');
const connectDB = require('./config/db');

const app = express(); // ✅ Move this up
const server = require('http').createServer(app); // ✅ After defining app

const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
    }
});

app.set('io', io);

connectDB(); // 💥 Connect MongoDB

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/message', messageRoutes);
app.use('/api/whatsapp', whatsappRoutes);

io.on('connection', (socket) => {
    // console.log(`🔌 New socket connected: ${socket.id}`);

    socket.on('join', (userId) => {
        socket.join(userId);
        socket.userId = userId; // 🔥 This line is crucial
        // console.log(`🧑‍💻 Socket ${socket.id} joined room: ${userId}`);
    });

    socket.on('pause', () => {
        if (socket.userId) {
            setPaused(socket.userId, true);
            console.log(`⏸️ Paused: ${socket.userId}`);
        }
    });

    socket.on('resume', () => {
        if (socket.userId) {
            setPaused(socket.userId, false);
            console.log(`▶️ Resumed: ${socket.userId}`);
        }
    });

    socket.on('cancel', () => {
        if (socket.userId) {
            setCancelled(socket.userId, true);
            setPaused(socket.userId, false); // just in case
            console.log(`🛑 Cancelled by user ${socket.userId}`);
        }
    });

    socket.on('disconnect', () => {
        console.log(`❌ Socket disconnected: ${socket.id}`);
    });
});

// Health Check
app.get('/', (req, res) => {
    res.send('🟢 MsgPilot Backend Running');
});


const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
    console.log(`🌐 Server running at http://localhost:${PORT}`);
});

