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
// WhatsApp QR Route (helps scan when terminal font is distorted)
app.get('/api/whatsapp/qr', (req, res) => {
    const qr = app.get('currentQR');
    res.setHeader('Content-Type', 'text/html');
    if (!qr) {
        return res.send(`
      <html>
        <head>
          <title>WhatsApp Status</title>
          <style>
            body { font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background: #f0f2f5; margin: 0; }
            .card { background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); text-align: center; max-width: 400px; }
            h2 { color: #128c7e; margin-top: 0; }
            p { color: #666; line-height: 1.5; }
          </style>
        </head>
        <body>
          <div class="card">
            <h2>WhatsApp Terhubung / QR Belum Siap</h2>
            <p>WhatsApp Anda mungkin sudah terhubung dengan sukses, atau server sedang menyiapkan QR Code baru. Silakan coba refresh halaman ini beberapa saat lagi atau cek dashboard.</p>
          </div>
        </body>
      </html>
    `);
    }
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qr)}`;
    res.send(`
    <html>
      <head>
        <title>Scan WhatsApp QR Code</title>
        <style>
          body { font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background: #f0f2f5; margin: 0; }
          .card { background: white; padding: 2.5rem; border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.12); text-align: center; max-width: 450px; }
          img { margin: 1.5rem 0; width: 300px; height: 300px; border: 1px solid #eaeaea; padding: 10px; border-radius: 8px; }
          h2 { color: #128c7e; margin-top: 0; }
          p { color: #444; line-height: 1.5; }
        </style>
      </head>
      <body>
        <div class="card">
          <h2>Hubungkan WhatsApp</h2>
          <p>Buka WhatsApp di HP Anda &gt; Perangkat Tertaut &gt; Tautkan Perangkat, lalu scan gambar QR di bawah ini:</p>
          <img src="${qrImageUrl}" alt="WhatsApp QR Code" />
          <p style="color: #666; font-size: 0.85rem; margin-bottom: 0;">Refresh halaman ini jika QR Code kadaluarsa atau tidak muncul.</p>
        </div>
      </body>
    </html>
  `);
});
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
    await (0, whatsapp_1.startWhatsApp)(app);
});
