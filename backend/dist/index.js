"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = exports.prisma = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const client_1 = require("@prisma/client");
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const whatsapp_1 = require("./whatsapp");
const ai_1 = require("./ai");
const auth_1 = __importDefault(require("./routes/auth"));
const knowledge_1 = __importDefault(require("./routes/knowledge"));
const chat_1 = __importDefault(require("./routes/chat"));
const publicChat_1 = __importDefault(require("./routes/publicChat"));
dotenv_1.default.config();
exports.prisma = new client_1.PrismaClient();
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
exports.io = new socket_io_1.Server(server, {
    cors: {
        origin: FRONTEND_URL,
        methods: ['GET', 'POST'],
        credentials: true,
    },
});
app.use((0, cors_1.default)({ origin: FRONTEND_URL, credentials: true }));
app.use(express_1.default.json());
// Routes
app.use('/api/auth', auth_1.default);
app.use('/api/knowledge', knowledge_1.default);
app.use('/api/chat', chat_1.default);
app.use('/api/public-chat', publicChat_1.default);
// Socket.io Connection
exports.io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});
const PORT = process.env.PORT || 5000;
server.listen(PORT, async () => {
    console.log(`Server is running on port ${PORT}`);
    // Initialize AI Services
    (0, ai_1.initAI)();
    // Start WhatsApp Service
    await (0, whatsapp_1.startWhatsApp)();
});
