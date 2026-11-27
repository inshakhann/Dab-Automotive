// FILE: src/modules/workforce/jobs/jobs.routes.js
const express = require('express');
const router = express.Router();
const jobsController = require('./jobs.controller');
const authenticate = require('../../../middleware/authenticate');

// Multer Middleware Import (Photos ke liye)
const upload = require('../../../middleware/upload.middleware'); // Path check kar lein

// --- Routes ---
// Job create aur assign
router.post('/create', authenticate, jobsController.createJob);
router.put('/:jobId/assign', authenticate, jobsController.assignJob);

// Mechanic apne assigned jobs dekhe
router.get('/assigned/:workerId', authenticate, jobsController.getAssignedJobs);

// Inspection aur Status Update
router.post('/:jobId/inspection', authenticate, jobsController.saveInspection);
router.put('/:jobId/status', authenticate, jobsController.updateStatus);

// Photo Upload (Yahan upload.single('photo') middleware laga hai)
router.post('/:jobId/photos', authenticate, upload.single('photo'), jobsController.uploadPhoto);

// Sabse aakhir mein export
module.exports = router;