require('dotenv').config();

process.env.JWT_SECRET = process.env.JWT_SECRET || 'pask_fallback_secret_please_set_env';
process.env.CLIENT_URL  = process.env.CLIENT_URL  || 'http://localhost:5173';
process.env.PORT        = process.env.PORT || '8080';

const express = require('express');
const http    = require('http');
const { Server } = require('socket.io');
const cors    = require('cors');
const mongoose = require('mongoose');
const path    = require('path');
const fs      = require('fs');

const authRoutes    = require('./routes/auth');
const serverRoutes  = require('./routes/servers');
const channelRoutes = require('./routes/channels');
const messageRoutes = require('./routes/messages');
const userRoutes    = require('./routes/users');
const friendRoutes  = require('./routes/friends');
const dmRoutes      = require('./routes/dm');
const roleRoutes    = require('./routes/roles');
const uploadRoutes  = require('./routes/upload');
const botRoutes     = require('./routes/bots');

const { initializeSocket } = require('./socket/socketHandler');
const { initBotGateway }   = require('./socket/botGateway');

const app = express();
const httpServer = http.createServer(app);

const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
const allowedOrigins = Array.from(new Set([
  clientUrl,
  'http://localhost:5173',
  'http://localhost:3000',
]));

// ======================= SOCKET =======================
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  },
});

// ======================= MIDDLEWARE =======================
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// create folders safely
['uploads/avatars', 'uploads/server-icons'].forEach(dir => {
  fs.mkdirSync(path.join(__dirname, dir), { recursive: true });
});

// ======================= MONGODB =======================
// MONGO_URL must be set explicitly — no localhost fallback in production
if (!process.env.MONGO_URL) {
  console.error('❌ MONGO_URL is missing — set it in your environment variables');
  process.exit(1);
}

mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => {
    console.error('❌ MongoDB error:', err);
    process.exit(1);
  });

// ======================= ROUTES =======================
app.use('/api/auth',     authRoutes);
app.use('/api/servers',  serverRoutes);
app.use('/api/channels', channelRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/users',    userRoutes);
app.use('/api/friends',  friendRoutes);
app.use('/api/dm',       dmRoutes);
app.use('/api/roles',    roleRoutes);
app.use('/api/upload',   uploadRoutes);
app.use('/api/bots',     botRoutes);

// ======================= HEALTH CHECK =======================
app.get('/api/health', (_, res) => {
  res.json({ status: 'OK', app: 'PASK' });
});

// ======================= SOCKET INIT =======================
initializeSocket(io);
initBotGateway(io);

// ======================= START SERVER =======================
const PORT = process.env.PORT || 8080;

httpServer.listen(PORT, () => {
  console.log(`🚀 PASK running on :${PORT}`);
});
