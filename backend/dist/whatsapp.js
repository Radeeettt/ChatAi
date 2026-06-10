"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sock = void 0;
exports.startWhatsApp = startWhatsApp;
const baileys_1 = __importStar(require("@whiskeysockets/baileys"));
const pino_1 = __importDefault(require("pino"));
const qrcode_terminal_1 = __importDefault(require("qrcode-terminal"));
const index_1 = require("./index");
const ai_1 = require("./ai");
exports.sock = null;
async function startWhatsApp() {
    const { state, saveCreds } = await (0, baileys_1.useMultiFileAuthState)('auth_info_baileys');
    exports.sock = (0, baileys_1.default)({
        auth: state,
        logger: (0, pino_1.default)({ level: 'silent' }),
    });
    exports.sock.ev.on('creds.update', saveCreds);
    exports.sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        // Print QR Code to terminal (replacement for deprecated printQRInTerminal)
        if (qr) {
            console.log('\n📱 Scan QR Code ini dengan WhatsApp Anda:\n');
            qrcode_terminal_1.default.generate(qr, { small: true });
        }
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== baileys_1.DisconnectReason.loggedOut;
            console.log('WhatsApp connection closed due to', lastDisconnect?.error, ', reconnecting', shouldReconnect);
            if (shouldReconnect) {
                startWhatsApp();
            }
        }
        else if (connection === 'open') {
            console.log('✅ WhatsApp connection opened successfully!');
        }
    });
    exports.sock.ev.on('messages.upsert', async (m) => {
        try {
            const msg = m.messages[0];
            if (!msg.message || msg.key.fromMe)
                return;
            const phoneNumber = msg.key.remoteJid;
            const messageText = msg.message.conversation || msg.message.extendedTextMessage?.text;
            if (!phoneNumber || !messageText)
                return;
            // Extract Name
            const name = msg.pushName || 'User';
            // 1. Get or Create Contact in DB
            let contact = await index_1.prisma.contact.findUnique({
                where: { phoneNumber }
            });
            if (!contact) {
                contact = await index_1.prisma.contact.create({
                    data: { phoneNumber, name }
                });
            }
            // 2. Save incoming message to DB
            const incomingMessage = await index_1.prisma.message.create({
                data: {
                    contactId: contact.id,
                    text: messageText,
                    isFromMe: false,
                }
            });
            // 3. Emit to frontend dashboard
            index_1.io.emit('new_message', { contact, message: incomingMessage });
            // 4. Check if AI Auto-Reply is active for this contact
            if (contact.isAiActive) {
                // Show typing indicator
                await exports.sock.sendPresenceUpdate('composing', phoneNumber);
                // Process via DeepSeek AI
                const aiReplyText = await (0, ai_1.getAIResponse)(messageText);
                // Send reply back to WhatsApp
                await exports.sock.sendMessage(phoneNumber, { text: aiReplyText });
                // Save AI reply to DB
                const outgoingMessage = await index_1.prisma.message.create({
                    data: {
                        contactId: contact.id,
                        text: aiReplyText,
                        isFromMe: true,
                    }
                });
                // Emit outgoing message to frontend dashboard
                index_1.io.emit('new_message', { contact, message: outgoingMessage });
            }
        }
        catch (error) {
            console.error('Error handling incoming message:', error);
        }
    });
}
