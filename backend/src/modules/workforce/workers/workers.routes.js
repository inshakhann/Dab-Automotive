// FILE: src/modules/workforce/workers/workers.routes.js
const express = require('express');
const router = express.Router();
const workersController = require('./workers.controller');
const authenticate = require('../../../middleware/authenticate');
const authorize = require('../../../middleware/authorize');
const validate = require('../../../middleware/validate');
const { createWorkerValidation, updateWorkerValidation } = require('../workforce.validation');

// Worker CRUD (Owner & Administrator)
router.post('/', authenticate, authorize('owner', 'administrator'), createWorkerValidation, validate, workersController.createWorker);
router.get('/', authenticate, authorize('owner', 'administrator'), workersController.getWorkers);
router.put('/:id', authenticate, authorize('owner', 'administrator'), updateWorkerValidation, validate, workersController.updateWorker);
router.delete('/:id', authenticate, authorize('owner', 'administrator'), workersController.deleteWorker);

// Attendance Routes (Mechanic - supports both logged-in user & explicit workerId)
router.post('/attendance/check-in', authenticate, authorize('mechanic'), workersController.checkIn);
router.post('/attendance/check-out', authenticate, authorize('mechanic'), workersController.checkOut);
router.post('/attendance/:workerId/check-in', authenticate, authorize('mechanic'), workersController.checkIn);
router.post('/attendance/:workerId/check-out', authenticate, authorize('mechanic'), workersController.checkOut);

module.exports = router;