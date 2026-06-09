"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const index_1 = require("../index");
const whatsapp_1 = require("../whatsapp");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticateToken);
// Get all contacts
router.get('/contacts', async (req, res) => {
    try {
        const contacts = await index_1.prisma.contact.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                messages: {
                    orderBy: { createdAt: 'desc' },
                    take: 1
                }
            }
        });
        res.json(contacts);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});
// Get messages for a contact
router.get('/messages/:contactId', async (req, res) => {
    try {
        const { contactId } = req.params;
        const messages = await index_1.prisma.message.findMany({
            where: { contactId: Number(contactId) },
            orderBy: { createdAt: 'asc' }
        });
        res.json(messages);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});
// Toggle AI for a contact (Human Takeover)
router.post('/toggle-ai/:contactId', async (req, res) => {
    try {
        const { contactId } = req.params;
        const { isAiActive } = req.body;
        const contact = await index_1.prisma.contact.update({
            where: { id: Number(contactId) },
            data: { isAiActive }
        });
        res.json(contact);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});
// Send a manual message
router.post('/send/:contactId', async (req, res) => {
    try {
        const { contactId } = req.params;
        const { text } = req.body;
        const contact = await index_1.prisma.contact.findUnique({
            where: { id: Number(contactId) }
        });
        if (!contact) {
            return res.status(404).json({ error: 'Contact not found' });
        }
        // Send via WhatsApp (Baileys)
        if (whatsapp_1.sock) {
            await whatsapp_1.sock.sendMessage(contact.phoneNumber, { text });
        }
        // Save to DB
        const message = await index_1.prisma.message.create({
            data: {
                contactId: contact.id,
                text,
                isFromMe: true,
            }
        });
        // Emit to socket so customer web page receives it in real-time
        index_1.io.emit('new_message', { contact, message });
        res.json(message);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});
exports.default = router;
