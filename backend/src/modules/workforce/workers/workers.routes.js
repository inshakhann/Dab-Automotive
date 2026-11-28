// FILE: src/modules/workforce/workers/workers.routes.js
const express = require('express');
const router = express.Router();
const workersController = require('./workers.controller');
const authenticate = require('../../../middleware/authenticate'); // 3 steps peeche

// Worker Routes
router.post('/', authenticate, workersController.createWorker); // Base URL: /api/workforce/workers
router.get('/', authenticate, workersController.getWorkers);

// Attendance Routes
router.post('/attendance/:workerId/check-in', authenticate, workersController.checkIn);
router.post('/attendance/:workerId/check-out', authenticate, workersController.checkOut);

module.exports = router;