import { Router } from 'express';
import { prisma } from '../index';
import { sock } from '../whatsapp';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

// Get all contacts
router.get('/contacts', async (req, res) => {
  try {
    const contacts = await prisma.contact.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });
    res.json(contacts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get messages for a contact
router.get('/messages/:contactId', async (req, res) => {
  try {
    const { contactId } = req.params;
    const messages = await prisma.message.findMany({
      where: { contactId: Number(contactId) },
      orderBy: { createdAt: 'asc' }
    });
    res.json(messages);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Toggle AI for a contact (Human Takeover)
router.post('/toggle-ai/:contactId', async (req, res) => {
  try {
    const { contactId } = req.params;
    const { isAiActive } = req.body;
    
    const contact = await prisma.contact.update({
      where: { id: Number(contactId) },
      data: { isAiActive }
    });
    res.json(contact);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Send a manual message
router.post('/send/:contactId', async (req, res) => {
  try {
    const { contactId } = req.params;
    const { text } = req.body;

    const contact = await prisma.contact.findUnique({
      where: { id: Number(contactId) }
    });

    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    // Send via WhatsApp (Baileys)
    if (sock) {
      await sock.sendMessage(contact.phoneNumber, { text });
    }

    // Save to DB
    const message = await prisma.message.create({
      data: {
        contactId: contact.id,
        text,
        isFromMe: true,
      }
    });

    res.json(message);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
