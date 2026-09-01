import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import './config/env.js';
import { connectDB } from './config/db.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import matchRoutes from './routes/matches.js';

import sportsRoutes from './routes/sportsRoutes.js';

import betRoutes from './routes/bets.js';
import externalRoutes from './routes/external.js';
import walletRoutes from './routes/wallet.js';
import adminRoutes from './routes/admin.js';
import http from 'http';
import { Server as IOServer } from 'socket.io';
import { createLudoSocket } from './ludo/ludoSocket.js';

dotenv.config();
//console.log("ODDS_API_KEY =", process.env.ODDS_API_KEY);

const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

// global error handlers to aid debugging crashes
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    // it's safer to exit on uncaught exceptions after logging
    process.exit(1);
});

const app = express();
const server = http.createServer(app);

// middleware
app.use(helmet());
app.use(cors({
    origin: allowedOrigins,
    credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use(rateLimit({ windowMs: 60 * 1000, max: 200 }));

// routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/bets', betRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/external', externalRoutes);

app.use('/api/sports', sportsRoutes);

app.get('/', (req, res) => res.send('BKR API'));
app.get('/health', (req, res) => res.json({ ok: true }));

const io = new IOServer(server, {
    cors: {
        origin: allowedOrigins,
        credentials: true,
    },
});

createLudoSocket(io.of('/ludo'));

const PORT = process.env.PORT || 4000;

// handle server listen errors (e.g., port already in use)
server.on('error', (err) => {
    if (err && err.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. Kill the process using the port or change PORT.`);
        process.exit(1);
    }
    console.error('Server error:', err);
});

connectDB().then(() => {
    server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});
