const express = require('express');
const router = express.Router();
const sourcesController = require('../controllers/sources.controller');
const { requireAdminKey } = require('../middleware/require-admin-key');

// GET /api/sources - List all sources
router.get('/', sourcesController.list);

// GET /api/sources/status - Source health/status
router.get('/status', sourcesController.getStatus);

// GET /api/sources/:id - Get source details
router.get('/:id', sourcesController.getById);

// PUT /api/sources/:id - Update source (Admin only)
router.put('/:id', requireAdminKey, sourcesController.update);

// POST /api/sources/:id/run - Trigger source run (Admin only)
router.post('/:id/run', requireAdminKey, sourcesController.run);

module.exports = router;
