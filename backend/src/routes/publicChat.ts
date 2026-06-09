import { Router } from 'express';
import { prisma, io } from '../index';
import { sock } from '../whatsapp';
import { getAIResponse } from '../ai';

const router = Router();

// Start public chat (creates or finds contact)
router.post('/start', async (req, res) => {
  try {
    const { name, phoneNumber } = req.body;
    if (!phoneNumber || !name) {
      return res.status(400).json({ error: 'Nama dan Nomor WhatsApp wajib diisi' });
    }

    // Format phone number to WhatsApp style
    let formattedPhone = phoneNumber.replace(/\D/g, ''); // only digits
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '62' + formattedPhone.slice(1);
    }
    if (!formattedPhone.endsWith('@s.whatsapp.net')) {
      formattedPhone = formattedPhone + '@s.whatsapp.net';
    }

    // Find or create contact
    let contact = await prisma.contact.findUnique({
      where: { phoneNumber: formattedPhone }
    });

    if (!contact) {
      contact = await prisma.contact.create({
        data: {
          phoneNumber: formattedPhone,
          name,
          isAiActive: true, // Default to AI auto-reply active
        }
      });
    } else {
      // Update name if name changes
      if (contact.name !== name) {
        contact = await prisma.contact.update({
          where: { id: contact.id },
          data: { name }
        });
      }
    }

    res.json(contact);
  } catch (error) {
    console.error('Error starting public chat:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get messages for public chat
router.get('/messages/:contactId', async (req, res) => {
  try {
    const { contactId } = req.params;
    const messages = await prisma.message.findMany({
      where: { contactId: Number(contactId) },
      orderBy: { createdAt: 'asc' }
    });
    res.json(messages);
  } catch (error) {
    console.error('Error fetching public messages:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Send message from public chat
router.post('/message', async (req, res) => {
  try {
    const { contactId, text } = req.body;
    if (!contactId || !text) {
      return res.status(400).json({ error: 'Contact ID dan pesan wajib diisi' });
    }

    const contact = await prisma.contact.findUnique({
      where: { id: Number(contactId) }
    });

    if (!contact) {
      return res.status(404).json({ error: 'Kontak tidak ditemukan' });
    }

    // 1. Save client's incoming message (isFromMe: false)
    const incomingMessage = await prisma.message.create({
      data: {
        contactId: contact.id,
        text,
        isFromMe: false,
      }
    });

    // 2. Emit to Socket.io for Admin Dashboard and Client UI update
    io.emit('new_message', { contact, message: incomingMessage });

    // 3. AI Auto-Reply if enabled
    if (contact.isAiActive) {
      // Process response from DeepSeek
      const aiReplyText = await getAIResponse(text);

      // Save AI reply to DB (isFromMe: true)
      const outgoingMessage = await prisma.message.create({
        data: {
          contactId: contact.id,
          text: aiReplyText,
          isFromMe: true,
        }
      });

      // Emit AI reply to Socket.io
      io.emit('new_message', { contact, message: outgoingMessage });

      // Send to WhatsApp if socket is connected
      if (sock) {
        try {
          await sock.sendMessage(contact.phoneNumber, { text: aiReplyText });
        } catch (waError) {
          console.error('Gagal mengirim notifikasi WhatsApp:', waError);
        }
      }
    }

    res.json(incomingMessage);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
