const express = require('express');
const { protect } = require('../middleware/auth');
const router = express.Router();

// POST /api/chat/ask — AI Campus Chat (Gemini)
router.post('/ask', protect, async (req, res) => {
    try {
        const { message } = req.body;
        if (!message) return res.status(400).json({ success: false, message: 'Message is required' });

        // Check if Gemini key is configured
        if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.startsWith('your-')) {
            const reply = getFallbackResponse(message);
            return res.json({ success: true, data: { reply, source: 'local' } });
        }

        const { GoogleGenerativeAI } = require('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        const systemPrompt = 'You are CampusAI, a helpful campus assistant for a university. Answer questions about library, events, transport, academics, wellness, and campus facilities. Be concise and friendly. Use emojis sparingly.';

        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\n\nUser question: ${message}` }] }],
            generationConfig: { maxOutputTokens: 500 },
        });

        const reply = result.response.text();
        res.json({ success: true, data: { reply, source: 'gemini' } });
    } catch (err) {
        console.error('Chat error:', err.message);
        const reply = getFallbackResponse(req.body.message || '');
        res.json({ success: true, data: { reply, source: 'fallback' } });
    }
});

function getFallbackResponse(msg) {
    const m = msg.toLowerCase();
    if (m.includes('library') || m.includes('book')) return '📚 Library Hours: Weekdays 8AM–10PM, Weekends 9AM–6PM. Visit SmartLib to browse and reserve books.';
    if (m.includes('bus') || m.includes('transport')) return '🚌 Campus buses run every 15 minutes. Check the Transport section for live schedules and routes.';
    if (m.includes('event') || m.includes('notice')) return '📅 Check the Notices section for upcoming events, exams, and announcements.';
    if (m.includes('attendance')) return '📊 Your attendance is tracked per subject. Visit the Attendance section for detailed stats.';
    if (m.includes('wellness') || m.includes('stress') || m.includes('help')) return '💙 CalmLink Wellness: Call Campus SOS at 1800-XXX-XXXX anytime. Counselors are available 24/7.';
    return 'I can help with library, events, transport, attendance, and wellness. What would you like to know?';
}

module.exports = router;
