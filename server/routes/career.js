const express = require('express');
const { protect } = require('../middleware/auth');
const router = express.Router();

// POST /api/career/roadmap — Generate AI career roadmap (Gemini)
router.post('/roadmap', protect, async (req, res) => {
    try {
        const { targetRole, skills, year } = req.body;
        if (!targetRole) return res.status(400).json({ success: false, message: 'Target role is required' });

        if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.startsWith('your-')) {
            return res.json({ success: true, data: { roadmap: getDefaultRoadmap(targetRole, skills), source: 'local' } });
        }

        const { GoogleGenerativeAI } = require('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        const prompt = `Create a 90-day learning roadmap for a ${year || '3rd'}-year student targeting the role of "${targetRole}". Their current skills: ${(skills || []).join(', ') || 'not specified'}. Return ONLY a valid JSON object with three keys: "month1", "month2", "month3". Each month should have: "title" (string), "goals" (array of 3-4 bullet strings), and "resources" (array of 2-3 resource names). Keep it practical and actionable. Return only JSON, no markdown or explanation.`;

        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: 800 },
        });

        const text = result.response.text();

        let roadmap;
        try {
            // Strip markdown code fences if Gemini wraps the JSON
            const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
            roadmap = JSON.parse(cleaned);
        } catch {
            roadmap = getDefaultRoadmap(targetRole, skills);
        }

        res.json({ success: true, data: { roadmap, source: 'gemini' } });
    } catch (err) {
        console.error('Roadmap error:', err.message);
        res.json({ success: true, data: { roadmap: getDefaultRoadmap(req.body.targetRole, req.body.skills), source: 'fallback' } });
    }
});

function getDefaultRoadmap(role, skills) {
    return {
        month1: { title: 'Foundation', goals: ['Master core concepts', 'Complete 2 online courses', 'Build 1 portfolio project', 'Join relevant communities'], resources: ['freeCodeCamp', 'Coursera', 'YouTube'] },
        month2: { title: 'Build & Apply', goals: [`Build a ${role || 'developer'} portfolio project`, 'Contribute to open source', 'Practice interview problems daily', 'Request peer code reviews'], resources: ['LeetCode', 'GitHub', 'Neetcode.io'] },
        month3: { title: 'Launch', goals: ['Polish resume with quantified achievements', 'Apply to 30+ positions', 'Mock interview 3 times weekly', 'Negotiate offers wisely'], resources: ['LinkedIn', 'Glassdoor', 'Pramp'] },
    };
}

module.exports = router;
