import makeWASocket, { useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import qrcode from 'qrcode-terminal';
import { io, prisma } from './index';
import { getAIResponse } from './ai';

export let sock: ReturnType<typeof makeWASocket> | null = null;

export async function startWhatsApp(app: any) {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');

  sock = makeWASocket({
    auth: state,
    logger: pino({ level: 'silent' }) as any,
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    // Print QR Code to terminal (replacement for deprecated printQRInTerminal)
    if (qr) {
      app.set('currentQR', qr);
      console.log('\n📱 Scan QR Code ini dengan WhatsApp Anda:\n');
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'close') {
      app.set('currentQR', null);
      const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('WhatsApp connection closed due to', lastDisconnect?.error, ', reconnecting', shouldReconnect);
      if (shouldReconnect) {
        startWhatsApp(app);
      }
    } else if (connection === 'open') {
      app.set('currentQR', null);
      console.log('✅ WhatsApp connection opened successfully!');
    }
  });

  sock.ev.on('messages.upsert', async (m) => {
    try {
      const msg = m.messages[0];
      if (!msg.message || msg.key.fromMe) return;

      const phoneNumber = msg.key.remoteJid;
      const messageText = msg.message.conversation || msg.message.extendedTextMessage?.text;

      if (!phoneNumber || !messageText) return;

      // Extract Name
      const name = msg.pushName || 'User';

      // 1. Get or Create Contact in DB
      let contact = await prisma.contact.findUnique({
        where: { phoneNumber }
      });

      if (!contact) {
        contact = await prisma.contact.create({
          data: { phoneNumber, name }
        });
      }

      // 2. Save incoming message to DB
      const incomingMessage = await prisma.message.create({
        data: {
          contactId: contact.id,
          text: messageText,
          isFromMe: false,
        }
      });

      // 3. Emit to frontend dashboard
      io.emit('new_message', { contact, message: incomingMessage });

      // 4. Check if AI Auto-Reply is active for this contact
      if (contact.isAiActive) {
        // Show typing indicator
        await sock!.sendPresenceUpdate('composing', phoneNumber);

        // Process via DeepSeek AI
        const aiReplyText = await getAIResponse(messageText);

        // Send reply back to WhatsApp
        await sock!.sendMessage(phoneNumber, { text: aiReplyText });

        // Save AI reply to DB
        const outgoingMessage = await prisma.message.create({
          data: {
            contactId: contact.id,
            text: aiReplyText,
            isFromMe: true,
          }
        });

        // Emit outgoing message to frontend dashboard
        io.emit('new_message', { contact, message: outgoingMessage });
      }
    } catch (error) {
      console.error('Error handling incoming message:', error);
    }
  });
}
