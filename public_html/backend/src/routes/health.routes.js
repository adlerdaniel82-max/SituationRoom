const express = require('express');
const router = express.Router();
const { ping } = require('../config/db');

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
  try {
    await ping();
    res.json({ ready: true });
  } catch (error) {
    res.status(503).json({
      ready: false,
      error: 'database_unreachable',
      message: error.message
    });
  }
});

module.exports = router;
