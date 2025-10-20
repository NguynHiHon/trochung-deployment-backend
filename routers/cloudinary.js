const express = require('express');
const router = express.Router();
const cloudinary = require('cloudinary').v2;

// Use real auth middleware from the project (verifyToken)
const { verifyToken } = require('../middleware/middlewareControllers');

// GET /api/cloudinary/sign - Test endpoint without auth first
router.get('/sign', (req, res) => {
  try {
    console.log('Cloudinary sign request received');
    console.log('Environment variables:', {
      CLOUD_NAME: process.env.CLOUD_NAME ? 'set' : 'not set',
      API_KEY: process.env.API_KEY ? 'set' : 'not set',
      API_SECRET: process.env.API_SECRET ? 'set' : 'not set'
    });
    
    const timestamp = Math.floor(Date.now() / 1000);
    const baseFolder = 'posts/test'; // Use test folder instead of user-specific
    const suffix = req.query.folder ? String(req.query.folder).replace(/^\/+|\/+$/g, '') : '';
    const folder = suffix ? `${baseFolder}/${suffix}` : baseFolder;
    
    console.log('Signing with folder:', folder);
    
    const paramsToSign = { timestamp, folder };
    const signature = cloudinary.utils.api_sign_request(paramsToSign, process.env.API_SECRET || 'demo');
    
    const response = { 
      signature, 
      timestamp, 
      apiKey: process.env.API_KEY || 'demo', 
      cloudName: process.env.CLOUD_NAME || 'demo', 
      folder 
    };
    
    console.log('Cloudinary sign response:', response);
    return res.json(response);
  } catch (err) {
    console.error('cloudinary sign error', err);
    return res.status(500).json({ error: 'server_error', message: err.message });
  }
});

// POST /api/cloudinary/verify - body { public_id }
router.post('/verify', async (req, res) => {
  try {
    const { public_id } = req.body || {};
    if (!public_id) return res.status(400).json({ error: 'missing public_id' });
    console.log('cloudinary verify public_id:', public_id);
    // Cloudinary Admin API does not accept resource_type='auto' for resource lookup.
    // Try common resource_type values and return the first successful lookup.
    const typesToTry = ['image', 'video', 'raw'];
    let lastErr = null;
    for (const t of typesToTry) {
      try {
        const resource = await cloudinary.api.resource(public_id, { resource_type: t });
        return res.json({ ok: true, resource, resource_type: t });
      } catch (e) {
        lastErr = e;
        // continue trying other types
      }
    }
    // nothing matched
    throw lastErr || new Error('resource lookup failed');
  } catch (err) {
    // Log error and return a structured detail object; stringify objects to avoid [object Object]
    console.error('cloudinary verify error', err);
    const rawMessage = err && err.message ? err.message : err;
    const detail = {
      message: (typeof rawMessage === 'object') ? JSON.stringify(rawMessage) : String(rawMessage),
      name: err && err.name ? err.name : undefined,
    };
    if (err && err.http_code) detail.http_code = err.http_code;
    if (err && err.request_id) detail.request_id = err.request_id;
    if (err && err.result) detail.result = err.result;
    if (process.env.NODE_ENV === 'development' && err && err.stack) detail.stack = err.stack;
    // Return the original HTTP code from Cloudinary error when available
    const statusCode = (err && err.http_code && Number.isInteger(err.http_code)) ? err.http_code : 500;
    return res.status(statusCode).json({ error: 'verify_failed', detail });
  }
});

module.exports = router;
