// FILE: src/modules/workforce/jobs/jobs.controller.js
const jobsService = require('./jobs.service');

const createJob = async (req, res) => {
    try {
        const newJob = await jobsService.createJob(req.body);
        res.status(201).json({ success: true, message: "Job card created", data: newJob });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const assignJob = async (req, res) => {
    try {
        const { jobId } = req.params;
        const { workerId, bayId } = req.body;
        const updatedJob = await jobsService.assignJob(jobId, workerId, bayId);
        res.status(200).json({ success: true, message: "Job assigned successfully", data: updatedJob });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

const getAssignedJobs = async (req, res) => {
    try {
        const jobs = await jobsService.getAssignedJobs(req.user, req.params.workerId);
        res.status(200).json({ success: true, data: jobs });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

const getJobById = async (req, res) => {
    try {
        const job = await jobsService.getSingleJob(req.params.jobId);
        res.status(200).json({ success: true, data: job });
    } catch (error) {
        const status = error.message === "Job not found" ? 404 : 500;
        res.status(status).json({ success: false, message: error.message });
    }
};

const updateJob = async (req, res) => {
    try {
        const updated = await jobsService.editJob(req.params.jobId, req.body);
        res.status(200).json({ success: true, message: "Job card updated", data: updated });
    } catch (error) {
        const status = error.message === "Job not found" ? 404 : 500;
        res.status(status).json({ success: false, message: error.message });
    }
};

const saveInspection = async (req, res) => {
    try {
        const { jobId } = req.params;
        const inspection = await jobsService.saveJobInspection(jobId, req.body);
        res.status(201).json({ success: true, message: "Inspection saved", data: inspection });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const updateStatus = async (req, res) => {
    try {
        const { jobId } = req.params;
        const { newStatus, labour_cost, parts_cost, pickup_fee } = req.body;
        const changedBy = req.user.id;

        const result = await jobsService.changeJobStatus(jobId, newStatus, changedBy, {
            labour_cost,
            parts_cost,
            pickup_fee
        });

        // Socket.IO Real-Time Update
        const io = req.app.get('socketio');
        if (io) {
            io.to(`job_${jobId}`).emit("status_updated", {
                jobId: Number(jobId),
                newStatus: newStatus,
                message: `Your vehicle status is now: ${newStatus}`,
                updatedAt: new Date()
            });
        }

        res.status(200).json({
            success: true,
            message: newStatus === 'Completed' ? "Job completed and invoice generated" : "Status updated",
            data: result
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

const uploadPhoto = async (req, res) => {
    try {
        const { jobId } = req.params;
        if (!req.file) {
            return res.status(400).json({ success: false, message: "No photo uploaded" });
        }
        const photoUrl = `/uploads/${req.file.filename}`;
        const uploadedBy = req.user.id;
        const caption = req.body.caption || null;
        const photo = await jobsService.savePhoto(jobId, photoUrl, uploadedBy, caption);
        res.status(201).json({ success: true, message: "Photo uploaded", data: photo });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const getVehicleHistory = async (req, res) => {
    try {
        const { vehicleId } = req.params;
        const history = await jobsService.getMaintenanceHistory(vehicleId);
        res.status(200).json({ success: true, data: history });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const getMechanicDashboard = async (req, res) => {
    try {
        const dashboard = await jobsService.getDashboardData(req.user, req.params.workerId);
        res.status(200).json({ success: true, data: dashboard });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

module.exports = {
    createJob,
    assignJob,
    getAssignedJobs,
    getJobById,
    updateJob,
    saveInspection,
    updateStatus,
    uploadPhoto,
    getVehicleHistory,
    getMechanicDashboard
};