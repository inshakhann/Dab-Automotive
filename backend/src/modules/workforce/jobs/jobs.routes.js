// FILE: src/modules/workforce/jobs/jobs.routes.js
const express = require('express');
const router = express.Router();
const jobsController = require('./jobs.controller');
const authenticate = require('../../../middleware/authenticate');
const authorize = require('../../../middleware/authorize');
const upload = require('../../../middleware/upload.middleware');
const validate = require('../../../middleware/validate');
const {
    createJobValidation,
    assignJobValidation,
    inspectionValidation,
    statusUpdateValidation
} = require('../workforce.validation');

// --- Static / Specific Routes FIRST (Dynamic :jobId se pehle) ---
router.get('/assigned', authenticate, authorize('mechanic'), jobsController.getAssignedJobs);
router.get('/assigned/:workerId', authenticate, authorize('mechanic', 'owner', 'administrator'), jobsController.getAssignedJobs);

router.get('/dashboard/mechanic', authenticate, authorize('mechanic'), jobsController.getMechanicDashboard);
router.get('/dashboard/mechanic/:workerId', authenticate, authorize('mechanic', 'owner'), jobsController.getMechanicDashboard);

router.get('/vehicles/:vehicleId/history', authenticate, authorize('customer', 'owner', 'administrator'), jobsController.getVehicleHistory);

// --- Job Create & Assign (Owner / Admin) ---
router.post('/create', authenticate, authorize('owner', 'administrator'), createJobValidation, validate, jobsController.createJob);
router.put('/:jobId/assign', authenticate, authorize('owner', 'administrator'), assignJobValidation, validate, jobsController.assignJob);

// --- Single Job & Live Customer Progress ---
router.get('/:jobId/progress', authenticate, authorize('customer', 'owner', 'mechanic', 'administrator'), jobsController.getJobById);
router.get('/:jobId', authenticate, authorize('customer', 'owner', 'mechanic', 'administrator'), jobsController.getJobById);
router.put('/:jobId', authenticate, authorize('owner', 'mechanic', 'administrator'), jobsController.updateJob);

// --- Inspection, Status & Photos (Mechanic) ---
router.post('/:jobId/inspection', authenticate, authorize('mechanic'), inspectionValidation, validate, jobsController.saveInspection);
router.put('/:jobId/status', authenticate, authorize('mechanic', 'owner'), statusUpdateValidation, validate, jobsController.updateStatus);
router.post('/:jobId/photos', authenticate, authorize('mechanic'), upload.single('photo'), jobsController.uploadPhoto);

module.exports = router;