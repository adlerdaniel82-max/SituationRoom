const express = require('express');
const router = express.Router();
const sourcesController = require('../controllers/sources.controller');

// GET /api/sources - List all sources
router.get('/', sourcesController.list);

// GET /api/sources/status - Source health/status
router.get('/status', sourcesController.getStatus);

// GET /api/sources/:id - Get source details
router.get('/:id', sourcesController.getById);

// PUT /api/sources/:id - Update source
router.put('/:id', sourcesController.update);

// POST /api/sources/:id/run - Trigger source run
router.post('/:id/run', sourcesController.run);

module.exports = router;
