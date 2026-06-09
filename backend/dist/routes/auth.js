"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const index_1 = require("../index");
const router = (0, express_1.Router)();
// Login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        // Check if user exists
        const user = await index_1.prisma.user.findUnique({ where: { username } });
        if (!user) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }
        // Check password
        const validPassword = await bcryptjs_1.default.compare(password, user.password);
        if (!validPassword) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }
        // Create token
        const token = jsonwebtoken_1.default.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET || 'supersecretjwtkey_please_change', { expiresIn: '24h' });
        res.json({ token, username: user.username });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});
// Create initial admin (For setup purposes only)
router.post('/setup', async (req, res) => {
    try {
        const count = await index_1.prisma.user.count();
        if (count > 0) {
            return res.status(400).json({ error: 'Admin already exists' });
        }
        const { username, password } = req.body;
        const salt = await bcryptjs_1.default.genSalt(10);
        const hashedPassword = await bcryptjs_1.default.hash(password, salt);
        const user = await index_1.prisma.user.create({
            data: { username, password: hashedPassword },
        });
        res.json({ message: 'Admin created successfully' });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});
exports.default = router;
