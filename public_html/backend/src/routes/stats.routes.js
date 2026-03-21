const express = require('express');
const router = express.Router();
const statsController = require('../controllers/stats.controller');

// GET /api/stats - Overall statistics
router.get('/', statsController.getOverview);

// GET /api/stats/by-type - Stats grouped by event type
router.get('/by-type', statsController.getByType);

// GET /api/stats/by-source - Stats grouped by source
router.get('/by-source', statsController.getBySource);

// GET /api/stats/timeline - Timeline statistics
router.get('/timeline', statsController.getTimeline);

module.exports = router;
