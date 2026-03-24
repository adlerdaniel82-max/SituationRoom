const express = require('express');
const router = express.Router();
const eventsController = require('../controllers/events.controller');

// GET /api/events - List events with filters
router.get('/', eventsController.list);

// GET /api/events/nearby - Get events near coordinates
router.get('/nearby', eventsController.getNearby);

// GET /api/events/stats - Get event statistics
router.get('/stats', eventsController.getStats);

// GET /api/events/:id/validation - Get persisted news-validation matches
router.get('/:id/validation', eventsController.getValidation);

// POST /api/events/:id/report-industrial - Mark FIRMS fire event as industrial heat
router.post('/:id/report-industrial', eventsController.reportIndustrialHeat);

// GET /api/events/:id - Get single event
router.get('/:id', eventsController.getById);

module.exports = router;
