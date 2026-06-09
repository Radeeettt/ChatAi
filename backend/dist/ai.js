"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAIResponse = exports.initAI = void 0;
const openai_1 = __importDefault(require("openai"));
const index_1 = require("./index");
let openai;
const initAI = () => {
    if (!process.env.DEEPSEEK_API_KEY) {
        console.warn('DEEPSEEK_API_KEY is not set. AI Auto-reply will not function.');
        return;
    }
    openai = new openai_1.default({
        apiKey: process.env.DEEPSEEK_API_KEY,
        baseURL: 'https://api.deepseek.com/v1', // DeepSeek uses an OpenAI-compatible API
    });
};
exports.initAI = initAI;
const getAIResponse = async (userMessage) => {
    if (!openai) {
        return "Maaf, sistem AI sedang tidak aktif. Silakan hubungi admin kami.";
    }
    try {
        // 1. Fetch Knowledge Base to inject as context (RAG)
        const kbEntries = await index_1.prisma.knowledgeBase.findMany();
        const context = kbEntries.map(entry => `[${entry.category}] ${entry.title}:\n${entry.content}`).join('\n\n');
        // 2. Build the prompt
        const systemPrompt = `Anda adalah asisten AI customer service yang profesional, ramah, dan solutif.
Tugas Anda adalah menjawab pertanyaan pelanggan berdasarkan informasi resmi berikut:

--- INFORMASI RESMI ---
${context}
-----------------------

Aturan menjawab:
1. Jawab HANYA berdasarkan informasi resmi di atas.
2. Jika informasi tidak ada di atas, katakan dengan sopan bahwa Anda tidak tahu dan tawarkan untuk menyambungkan dengan agen manusia (admin).
3. Gunakan bahasa Indonesia yang baik, sopan, namun tidak kaku.
4. Jawablah dengan singkat, padat, dan jelas.`;
        const response = await openai.chat.completions.create({
            model: 'deepseek-chat',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userMessage }
            ],
            temperature: 0.3, // Lower temperature for more factual answers
        });
        return response.choices[0].message?.content || "Maaf, saya tidak dapat merespons saat ini.";
    }
    catch (error) {
        console.error('DeepSeek AI Error:', error);
        return "Maaf, terjadi kesalahan pada sistem AI kami.";
    }
};
exports.getAIResponse = getAIResponse;
