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

// 5. Job Status update karna (State Machine Validation ke sath)
const changeJobStatus = async (jobId, newStatus, changedBy) => {
    
    // Pehle current job nikalain taake pata chale abhi status kya hai
    const currentJob = await jobsRepo.getJobById(jobId);
    
    if (!currentJob) {
        throw new Error("Job not found");
    }

    const currentStatus = currentJob.status;

    // State Machine Rules (Kaunsa status kis status ke baad aayega)
    const allowedTransitions = {
        'Pending': ['Inspection', 'Cancelled'],
        'Inspection': ['In-Repair', 'Cancelled'],
        'In-Repair': ['Quality-Check', 'Cancelled'],
        'Quality-Check': ['Completed', 'Cancelled'],
        'Completed': [], // Completed ke baad kuch nahi
        'Cancelled': []  // Cancelled ke baad kuch nahi
    };

    // Check karein ke kya status change allowed hai
    const allowedNextStatuses = allowedTransitions[currentStatus];

    if (!allowedNextStatuses.includes(newStatus)) {
        throw new Error(`Invalid status transition! Cannot change from '${currentStatus}' to '${newStatus}'. Allowed next steps: ${allowedNextStatuses.join(', ')}`);
    }

    // Agar sab theek hai, toh database mein status update karein
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