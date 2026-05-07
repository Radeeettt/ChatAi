import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import http from 'http';
import { Server } from 'socket.io';
import { startWhatsApp } from './whatsapp';
import { initAI } from './ai';

import authRoutes from './routes/auth';
import knowledgeRoutes from './routes/knowledge';
import chatRoutes from './routes/chat';

dotenv.config();

export const prisma = new PrismaClient();

const app = express();
const server = http.createServer(app);
export const io = new Server(server, {
  cors: {
    origin: '*',
  },
});

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/knowledge', knowledgeRoutes);
app.use('/api/chat', chatRoutes);

// Socket.io Connection
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);
  
  // Initialize AI Services
  initAI();

  // Start WhatsApp Service
  await startWhatsApp();
});
