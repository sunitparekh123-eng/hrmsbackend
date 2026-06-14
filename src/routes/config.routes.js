const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const env = require('../config/env');

// GET /api/v1/config/maps-key — expose Google Maps API key to authenticated users
router.get('/maps-key', authenticate, (req, res) => {
  // Prevent browser caching so the key is always fresh
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.set('Surrogate-Control', 'no-store');
  res.json({
    success: true,
    data: {
      googleMapsApiKey: env.GOOGLE_MAPS_API_KEY || null,
    },
  });
});

module.exports = router;