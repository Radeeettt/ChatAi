"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const index_1 = require("../index");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Protect all knowledge base routes
router.use(auth_1.authenticateToken);
// Get all knowledge base entries
router.get('/', async (req, res) => {
    try {
        const kb = await index_1.prisma.knowledgeBase.findMany({
            orderBy: { createdAt: 'desc' }
        });
        res.json(kb);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});
// Add new entry
router.post('/', async (req, res) => {
    try {
        const { title, content, category } = req.body;
        const newEntry = await index_1.prisma.knowledgeBase.create({
            data: { title, content, category },
        });
        res.json(newEntry);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});
// Update an entry
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { title, content, category } = req.body;
        const updated = await index_1.prisma.knowledgeBase.update({
            where: { id: Number(id) },
            data: { title, content, category },
        });
        res.json(updated);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});
// Delete an entry
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await index_1.prisma.knowledgeBase.delete({
            where: { id: Number(id) },
        });
        res.json({ message: 'Deleted successfully' });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});
exports.default = router;
