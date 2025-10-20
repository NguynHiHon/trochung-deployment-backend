const Support = require('../models/Support');
const crypto = require('crypto');

const CAPTCHA_SECRET = process.env.CAPTCHA_SECRET || (process.env.JWT_SECRET || 'default_secret');

function generateCaptchaCode(length = 4) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let out = '';
    for (let i = 0; i < length; i++) out += chars[Math.floor(Math.random() * chars.length)];
    return out;
}

function signCaptcha(code, expiresAtMs) {
    const data = `${code}:${expiresAtMs}`;
    const sig = crypto.createHmac('sha256', CAPTCHA_SECRET).update(data).digest('hex');
    return `${expiresAtMs}.${sig}`; // token
}

function verifyCaptcha(enteredCode, token) {
    if (!enteredCode || !token) return false;
    const [expiresAtStr, sig] = String(token).split('.');
    const expiresAtMs = Number(expiresAtStr);
    if (!expiresAtMs || !sig) return false;
    if (Date.now() > expiresAtMs) return false; // expired
    const expectedSig = crypto
        .createHmac('sha256', CAPTCHA_SECRET)
        .update(`${enteredCode}:${expiresAtMs}`)
        .digest('hex');
    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig));
}

const supportController = {
    create: async (req, res) => {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({ success: false, message: 'Unauthorized' });
            }

            const { name, email, phone, message, captcha } = req.body;
            if (!name || !email || !message) {
                return res.status(400).json({ success: false, message: 'Missing required fields' });
            }

            // Captcha verification
            const isCaptchaOk = verifyCaptcha(captcha?.code, captcha?.token);
            if (!isCaptchaOk) {
                return res.status(400).json({ success: false, message: 'Invalid captcha' });
            }

            const doc = await Support.create({ userId, name, email, phone, message });
            return res.status(201).json({ success: true, data: doc });
        } catch (err) {
            console.error('Create support error:', err);
            return res.status(500).json({ success: false, message: 'Server error' });
        }
    },

    listMine: async (req, res) => {
        try {
            const userId = req.user?.id;
            if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });
            const items = await Support.find({ userId }).sort({ createdAt: -1 });
            return res.json({ success: true, data: items });
        } catch (err) {
            console.error('List support error:', err);
            return res.status(500).json({ success: false, message: 'Server error' });
        }
    },

    captcha: async (_req, res) => {
        // Generate a short code and signed token, expire in 3 minutes
        const code = generateCaptchaCode(4);
        const expiresAtMs = Date.now() + 3 * 60 * 1000;
        const token = signCaptcha(code, expiresAtMs);
        // For simplicity we return the code as display text
        return res.json({ success: true, display: code, token, expiresAt: expiresAtMs });
    }
};

module.exports = supportController;


