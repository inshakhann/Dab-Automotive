// FILE: src/modules/workforce/jobs/jobs.service.js
const jobsRepo = require('./jobs.repo');

// 1. Job Create karna
const createJob = async (jobData) => {
    return await jobsRepo.createJobCard(jobData);
};

// 2. Job Assign karna
const assignJob = async (jobId, workerId) => {
    return await jobsRepo.assignJobCard(jobId, workerId);
};

// 3. Mechanic ke assigned jobs lena
const getAssignedJobs = async (workerId) => {
    return await jobsRepo.getMechanicJobs(workerId);
};

// 4. Inspection save karna
const saveJobInspection = async (jobId, inspectionData) => {
    return await jobsRepo.saveInspection(jobId, inspectionData);
};

// 5. Job Status update karna
const changeJobStatus = async (jobId, newStatus, changedBy) => {
    return await jobsRepo.updateJobStatus(jobId, newStatus, changedBy);
};

// 6. Job Photo save karna
const savePhoto = async (jobId, photoUrl, uploadedBy) => {
    return await jobsRepo.saveJobPhoto(jobId, photoUrl, uploadedBy);
};

// 7. Vehicle Maintenance History
const getMaintenanceHistory = async (vehicleId) => {
    return await jobsRepo.getVehicleHistory(vehicleId);
};

// 8. Mechanic Dashboard Data
const getDashboardData = async (workerId) => {
    return await jobsRepo.getMechanicDashboard(workerId);
};

// SAARE FUNCTIONS EK SATH EXPORT KAREIN
module.exports = { 
    createJob, 
    assignJob, 
    getAssignedJobs, 
    saveJobInspection, 
    changeJobStatus, 
    savePhoto,
    getMaintenanceHistory,
    getDashboardData
};