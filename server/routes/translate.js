const express = require('express');
const router = express.Router();

router.post('/', async (req, res) => {
    try {
        const { input, target_language_code } = req.body;

        if (!input || !target_language_code) {
            return res.status(400).json({ success: false, message: 'Input text and target language are required.' });
        }

        const apiKey = process.env.SARVAM_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ success: false, message: 'Sarvam API key not configured on server.' });
        }

        const response = await fetch('https://api.sarvam.ai/translate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'api-subscription-key': apiKey
            },
            body: JSON.stringify({
                input: input,
                source_language_code: 'en-IN',
                target_language_code: target_language_code,
                speaker_gender: 'Male',
                mode: 'formal',
                model: 'sarvam-translate:v1',
                enable_preprocessing: true
            })
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error('Sarvam API Error:', errorData);
            return res.status(response.status).json({ success: false, message: 'Translation failed', details: errorData });
        }

        const data = await response.json();
        
        // According to standard translation API responses, the translated text is part of the response json
        res.json({ success: true, translated_text: data.translated_text || data.output || data });

    } catch (err) {
        console.error('Translation route error:', err);
        res.status(500).json({ success: false, message: 'Server error during translation' });
    }
});

module.exports = router;
