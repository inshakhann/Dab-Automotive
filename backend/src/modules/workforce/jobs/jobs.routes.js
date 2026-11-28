// FILE: src/modules/workforce/jobs/jobs.routes.js
const express = require('express');
const router = express.Router();
const jobsController = require('./jobs.controller');
const authenticate = require('../../../middleware/authenticate');
const upload = require('../../../middleware/upload.middleware'); // Multer

// --- Job Create & Assign ---
router.post('/create', authenticate, jobsController.createJob);
router.put('/:jobId/assign', authenticate, jobsController.assignJob);

// --- Mechanic Jobs & Dashboard ---
router.get('/assigned/:workerId', authenticate, jobsController.getAssignedJobs);
router.get('/dashboard/mechanic/:workerId', authenticate, jobsController.getMechanicDashboard); // <-- Naya Route

// --- Inspection, Status & Photos ---
router.post('/:jobId/inspection', authenticate, jobsController.saveInspection);
router.put('/:jobId/status', authenticate, jobsController.updateStatus);
router.post('/:jobId/photos', authenticate, upload.single('photo'), jobsController.uploadPhoto);

// --- Vehicle History ---
router.get('/vehicles/:vehicleId/history', authenticate, jobsController.getVehicleHistory);

// Sabse aakhir mein export
module.exports = router;