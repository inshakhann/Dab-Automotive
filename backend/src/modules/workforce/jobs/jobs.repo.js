// FILE: src/modules/workforce/jobs/jobs.repo.js
const db = require('../../../config/db'); // Path check kar lein (3 steps upar)

// 1. Naya Job Card banane ka function
const createJobCard = async (jobData) => {
    const { booking_id, vehicle_id, complaint_details } = jobData;
    const query = `
        INSERT INTO job_cards (booking_id, vehicle_id, complaint_details) 
        VALUES ($1, $2, $3) RETURNING *;
    `;
    const result = await db.query(query, [booking_id, vehicle_id, complaint_details]);
    return result.rows[0];
};

// 2. Job Card ko Mechanic ko assign karne ka function
const assignJobCard = async (jobId, workerId) => {
    const query = `
        UPDATE job_cards 
        SET assigned_worker_id = $1, status = 'Inspection' 
        WHERE id = $2 RETURNING *;
    `;
    const result = await db.query(query, [workerId, jobId]);
    return result.rows[0];
};

// 3. Mechanic ke apne assigned jobs dekhne ka function
const getMechanicJobs = async (workerId) => {
    const query = `
        SELECT * FROM job_cards 
        WHERE assigned_worker_id = $1 
        ORDER BY created_at DESC;
    `;
    const result = await db.query(query, [workerId]);
    return result.rows;
};

// 4. Inspection save karne ka function
const saveInspection = async (jobId, inspectionData) => {
    const { checklist_data, faults_found, mechanic_notes } = inspectionData;
    const query = `
        INSERT INTO job_inspections (job_card_id, checklist_data, faults_found, mechanic_notes) 
        VALUES ($1, $2, $3, $4) RETURNING *;
    `;
    const result = await db.query(query, [jobId, JSON.stringify(checklist_data), faults_found, mechanic_notes]);
    return result.rows[0];
};

// 5. Status update karne aur Log save karne ka function
const updateJobStatus = async (jobId, newStatus, changedBy) => {
    const currentJob = await db.query('SELECT status FROM job_cards WHERE id = $1', [jobId]);
    if (currentJob.rows.length === 0) throw new Error("Job not found");
    const oldStatus = currentJob.rows[0].status;

    const updateQuery = `UPDATE job_cards SET status = $1 WHERE id = $2 RETURNING *;`;
    const updatedJob = await db.query(updateQuery, [newStatus, jobId]);

    const logQuery = `
        INSERT INTO job_status_log (job_card_id, old_status, new_status, changed_by) 
        VALUES ($1, $2, $3, $4) RETURNING *;
    `;
    await db.query(logQuery, [jobId, oldStatus, newStatus, changedBy]);

    return updatedJob.rows[0];
};

// 6. Job Photo save karne ka function
const saveJobPhoto = async (jobId, photoUrl, uploadedBy) => {
    const query = `
        INSERT INTO job_photos (job_card_id, photo_url, uploaded_by) 
        VALUES ($1, $2, $3) RETURNING *;
    `;
    const result = await db.query(query, [jobId, photoUrl, uploadedBy]);
    return result.rows[0];
};
// 7. Vehicle ki maintenance history nikalne ka function
const getVehicleHistory = async (vehicleId) => {
    const query = `
        SELECT 
            jc.id AS job_card_id,
            jc.complaint_details,
            jc.status,
            jc.created_at,
            ji.faults_found,
            ji.mechanic_notes,
            i.total_amount,
            i.status AS invoice_status
        FROM job_cards jc
        LEFT JOIN job_inspections ji ON jc.id = ji.job_card_id
        LEFT JOIN invoices i ON jc.id = i.job_card_id
        WHERE jc.vehicle_id = $1 AND jc.status = 'Completed'
        ORDER BY jc.created_at DESC;
    `;
    const result = await db.query(query, [vehicleId]);
    return result.rows;
};
// 8. Mechanic Dashboard ka data lana
const getMechanicDashboard = async (workerId) => {
    const jobsQuery = `
        SELECT * FROM job_cards 
        WHERE assigned_worker_id = $1 AND status != 'Completed' AND status != 'Cancelled'
        ORDER BY created_at DESC;
    `;
    const jobsResult = await db.query(jobsQuery, [workerId]);

    const attendanceQuery = `
        SELECT * FROM worker_attendance 
        WHERE worker_id = $1 AND date = CURRENT_DATE;
    `;
    const attendanceResult = await db.query(attendanceQuery, [workerId]);

    return {
        activeJobs: jobsResult.rows,
        todayAttendance: attendanceResult.rows[0] || null
    };
};

// SAARE FUNCTIONS EK SATH EXPORT KAREIN (Sirf ek dafa)
module.exports = { 
    createJobCard, 
    assignJobCard, 
    getMechanicJobs, 
    saveInspection, 
    updateJobStatus, 
    saveJobPhoto,
    getVehicleHistory,
    getMechanicDashboard
};