const express = require('express');
const router = express.Router();
const workforceController = require('./workforce.controller');
const authenticate = require('../../middleware/authenticate'); 

// Worker Routes
router.post('/workers', authenticate, workforceController.createWorker);
router.get('/workers', authenticate, workforceController.getWorkers);

// Attendance Routes (Yeh 2 lines sabse ahem hain)
router.post('/attendance/:workerId/check-in', authenticate, workforceController.checkIn);
router.post('/attendance/:workerId/check-out', authenticate, workforceController.checkOut);

module.exports = router;