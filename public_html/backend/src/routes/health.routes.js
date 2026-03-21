const express = require('express');
const router = express.Router();

// GET /api/health - Health check
router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// GET /api/health/ready - Readiness check
router.get('/ready', async (req, res) => {
  // TODO: Add database connectivity check
  res.json({ ready: true });
});

module.exports = router;
