// FILE: src/modules/workforce/jobs/jobs.controller.js
const jobsService = require('./jobs.service');

// 1. Owner Job Card banaye
const createJob = async (req, res) => {
    try {
        const newJob = await jobsService.createJob(req.body);
        res.status(201).json({ success: true, message: "Job card created", data: newJob });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 2. Owner Job ko Mechanic assign kare
const assignJob = async (req, res) => {
    try {
        const { jobId } = req.params;
        const { workerId } = req.body; 
        const updatedJob = await jobsService.assignJob(jobId, workerId);
        res.status(200).json({ success: true, message: "Job assigned successfully", data: updatedJob });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 3. Mechanic apne jobs dekhe
const getAssignedJobs = async (req, res) => {
    try {
        const { workerId } = req.params;
        const jobs = await jobsService.getAssignedJobs(workerId);
        res.status(200).json({ success: true, data: jobs });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 4. Mechanic Inspection save kare
const saveInspection = async (req, res) => {
    try {
        const { jobId } = req.params;
        const inspection = await jobsService.saveJobInspection(jobId, req.body);
        res.status(201).json({ success: true, message: "Inspection saved", data: inspection });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 5. Job ka Status update kare
const updateStatus = async (req, res) => {
    try {
        const { jobId } = req.params;
        const { newStatus } = req.body;
        const changedBy = req.user ? req.user.id : 1; 
        
        const updatedJob = await jobsService.changeJobStatus(jobId, newStatus, changedBy);
        
        // Socket.IO Event
        const io = req.app.get('socketio');
        if (io) {
            io.to(`job_${jobId}`).emit("status_updated", {
                jobId: jobId,
                newStatus: newStatus,
                message: `Your vehicle status is now: ${newStatus}`
            });
        }

        res.status(200).json({ success: true, message: "Status updated", data: updatedJob });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 6. Mechanic Photo upload kare
const uploadPhoto = async (req, res) => {
    try {
        const { jobId } = req.params;
        if (!req.file) {
            return res.status(400).json({ success: false, message: "No photo uploaded" });
        }
        const photoUrl = `/uploads/${req.file.filename}`;
        const uploadedBy = req.user ? req.user.id : 1;
        const photo = await jobsService.savePhoto(jobId, photoUrl, uploadedBy);
        res.status(201).json({ success: true, message: "Photo uploaded", data: photo });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 7. Vehicle History nikalna
const getVehicleHistory = async (req, res) => {
    try {
        const { vehicleId } = req.params;
        const history = await jobsService.getMaintenanceHistory(vehicleId);
        res.status(200).json({ success: true, data: history });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 8. Mechanic Dashboard
const getMechanicDashboard = async (req, res) => {
    try {
        const { workerId } = req.params;
        const dashboard = await jobsService.getDashboardData(workerId);
        res.status(200).json({ success: true, data: dashboard });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Saare functions ek sath export karein
module.exports = { 
    createJob, 
    assignJob, 
    getAssignedJobs, 
    saveInspection, 
    updateStatus, 
    uploadPhoto,
    getVehicleHistory,
    getMechanicDashboard
};