const express = require('express');
const router = express.Router();
const configController = require('../controllers/config.controller');

router.get('/public', configController.getPublicConfig);

module.exports = router;
