// FILE: src/modules/workforce/jobs/jobs.service.js
const jobsRepo = require('./jobs.repo');
const invoicesService = require('../invoices/invoices.service');
const db = require('../../../config/db');

const createJob = async (jobData) => {
    return await jobsRepo.createJobCard(jobData);
};

const assignJob = async (jobId, workerId, bayId) => {
    const updated = await jobsRepo.assignJobCard(jobId, workerId, bayId);
    if (!updated) throw new Error("Job not found");
    return updated;
};

const getAssignedJobs = async (user, paramWorkerId) => {
    let workerId = paramWorkerId ? Number(paramWorkerId) : null;
    if (user.role === 'mechanic') {
        const worker = await jobsRepo.getWorkerByUserId(user.id);
        if (!worker) throw new Error("Worker profile not found.");
        workerId = worker.id;
    }
    return await jobsRepo.getMechanicJobs(workerId);
};

const getSingleJob = async (jobId) => {
    const job = await jobsRepo.getJobDetails(jobId);
    if (!job) throw new Error("Job not found");
    return job;
};

const editJob = async (jobId, updateData) => {
    const updated = await jobsRepo.updateJobDetails(jobId, updateData);
    if (!updated) throw new Error("Job not found");
    return updated;
};

const saveJobInspection = async (jobId, inspectionData) => {
    return await jobsRepo.saveInspection(jobId, inspectionData);
};

// State Machine + Auto-Invoice on Completion
const changeJobStatus = async (jobId, newStatus, changedBy, billingInfo = {}) => {
    const currentJob = await jobsRepo.getJobById(jobId);
    if (!currentJob) {
        throw new Error("Job not found");
    }

    const currentStatus = currentJob.status;

    const allowedTransitions = {
        'Pending': ['Assigned', 'Inspection', 'Cancelled'],
        'Assigned': ['Inspection', 'Cancelled'],
        'Inspection': ['AwaitingParts', 'In-Repair', 'Cancelled'],
        'AwaitingParts': ['In-Repair', 'Cancelled'],
        'In-Repair': ['Quality-Check', 'Cancelled'],
        'Quality-Check': ['Completed', 'In-Repair', 'Cancelled'],
        'Completed': [],
        'Cancelled': []
    };

    const allowedNextStatuses = allowedTransitions[currentStatus] || [];
    if (!allowedNextStatuses.includes(newStatus)) {
        throw new Error(
            `Invalid status transition! Cannot change from '${currentStatus}' to '${newStatus}'. Allowed next steps: ${allowedNextStatuses.join(', ')}`
        );
    }

    const updatedJob = await jobsRepo.updateJobStatus(jobId, newStatus, changedBy);

    // Jab Job 'Completed' ho to automatically Invoice generate karein
    let generatedInvoice = null;
    if (newStatus === 'Completed') {
        let labourCost = Number(billingInfo.labour_cost || 0);
        let partsCost = Number(billingInfo.parts_cost || 0);
        let pickupFee = Number(billingInfo.pickup_fee || 0);

        // Agar booking/package tables mojood hon to un se prices fetch karein
        try {
            const pkgRes = await db.query(
                `SELECT sp.price, COALESCE(pr.fee, 0) AS pickup_fee
                 FROM service_bookings sb
                 JOIN service_packages sp ON sb.package_id = sp.id
                 LEFT JOIN pickup_requests pr ON pr.booking_id = sb.id
                 WHERE sb.id = $1`,
                [updatedJob.booking_id]
            );
            if (pkgRes.rows.length > 0) {
                if (!labourCost) labourCost = Number(pkgRes.rows[0].price || 0);
                if (!pickupFee) pickupFee = Number(pkgRes.rows[0].pickup_fee || 0);
            }
        } catch {
            // Booking tables abhi create nahi huin to default/passed values use hongi
        }

        // Issued parts ki cost calculate karein (agar Roman ke tables mojood hon)
        try {
            const partsRes = await db.query(
                `SELECT COALESCE(SUM(ri.issued_qty * p.unit_cost), 0) AS total_parts
                 FROM parts_requisitions pr
                 JOIN requisition_items ri ON pr.id = ri.requisition_id
                 JOIN parts p ON ri.part_id = p.id
                 WHERE pr.job_card_id = $1 AND pr.status = 'Issued'`,
                [jobId]
            );
            if (!partsCost && partsRes.rows.length > 0) {
                partsCost = Number(partsRes.rows[0].total_parts || 0);
            }
        } catch {
            // Inventory tables abhi create nahi huin to default/passed value use hogi
        }

        generatedInvoice = await invoicesService.createNewInvoice({
            job_card_id: updatedJob.id,
            labour_cost: labourCost,
            parts_cost: partsCost,
            pickup_fee: pickupFee
        });
    }

    return { job: updatedJob, invoice: generatedInvoice };
};

const savePhoto = async (jobId, photoUrl, uploadedBy, caption) => {
    return await jobsRepo.saveJobPhoto(jobId, photoUrl, uploadedBy, caption);
};

const getMaintenanceHistory = async (vehicleId) => {
    return await jobsRepo.getVehicleHistory(vehicleId);
};

const getDashboardData = async (user, paramWorkerId) => {
    let workerId = paramWorkerId ? Number(paramWorkerId) : null;
    if (user.role === 'mechanic') {
        const worker = await jobsRepo.getWorkerByUserId(user.id);
        if (!worker) throw new Error("Worker profile not found.");
        workerId = worker.id;
    }
    return await jobsRepo.getMechanicDashboard(workerId, user.id);
};

module.exports = {
    createJob,
    assignJob,
    getAssignedJobs,
    getSingleJob,
    editJob,
    saveJobInspection,
    changeJobStatus,
    savePhoto,
    getMaintenanceHistory,
    getDashboardData
};