// FILE: src/modules/workforce/jobs/jobs.repo.js
const db = require('../../../config/db');

// 1. Naya Job Card banana
const createJobCard = async (jobData) => {
    const { booking_id, vehicle_id, complaint_details, priority = 'Normal', deadline = null } = jobData;
    const query = `
        INSERT INTO job_cards (booking_id, vehicle_id, complaint_details, priority, deadline)
        VALUES ($1, $2, $3, $4, $5) RETURNING *;
    `;
    const result = await db.query(query, [booking_id, vehicle_id, complaint_details, priority, deadline]);
    return result.rows[0];
};

// 2. Job Card ko Mechanic aur Bay assign karna (Workload & Bay check ke sath)
const assignJobCard = async (jobId, workerId, bayId = null) => {
    const workerCheck = await db.query('SELECT id, status FROM workers WHERE id = $1', [workerId]);
    if (workerCheck.rows.length === 0 || workerCheck.rows[0].status !== 'Active') {
        throw new Error("Selected mechanic does not exist or is inactive.");
    }

    if (bayId) {
        const bayConflict = await db.query(
            `SELECT id FROM job_cards WHERE bay_id = $1 AND id != $2 AND status NOT IN ('Completed', 'Cancelled')`,
            [bayId, jobId]
        );
        if (bayConflict.rows.length > 0) {
            throw new Error("Selected workshop bay is currently occupied by another active job.");
        }
    }

    const query = `
        UPDATE job_cards
        SET 
            assigned_worker_id = $1,
            bay_id = COALESCE($2, bay_id),
            status = 'Assigned'
        WHERE id = $3
        RETURNING *;
    `;
    const result = await db.query(query, [workerId, bayId, jobId]);
    return result.rows[0];
};

// 3. Mechanic ke assigned jobs (Priority aur Deadline ke mutabiq sorted)
const getMechanicJobs = async (workerId) => {
    const query = `
        SELECT * FROM job_cards
        WHERE assigned_worker_id = $1
        ORDER BY 
            CASE priority
                WHEN 'Urgent' THEN 1
                WHEN 'High' THEN 2
                WHEN 'Normal' THEN 3
                WHEN 'Low' THEN 4
                ELSE 5
            END ASC,
            deadline ASC NULLS LAST,
            created_at DESC;
    `;
    const result = await db.query(query, [workerId]);
    return result.rows;
};

// 4. Single Job Card details + Inspection + Photos + Status Log (Live Progress ke liye bhi)
const getJobDetails = async (jobId) => {
    const jobRes = await db.query('SELECT * FROM job_cards WHERE id = $1', [jobId]);
    if (jobRes.rows.length === 0) return null;

    const [inspectionsRes, photosRes, logsRes] = await Promise.all([
        db.query('SELECT * FROM job_inspections WHERE job_card_id = $1 ORDER BY inspected_at DESC', [jobId]),
        db.query('SELECT * FROM job_photos WHERE job_card_id = $1 ORDER BY uploaded_at DESC', [jobId]),
        db.query('SELECT * FROM job_status_log WHERE job_card_id = $1 ORDER BY created_at ASC', [jobId])
    ]);

    return {
        ...jobRes.rows[0],
        inspections: inspectionsRes.rows,
        photos: photosRes.rows,
        status_history: logsRes.rows
    };
};

// 5. Job Card fields update karna
const updateJobDetails = async (jobId, updateData) => {
    const { complaint_details, priority, deadline, bay_id } = updateData;
    const query = `
        UPDATE job_cards
        SET
            complaint_details = COALESCE($1, complaint_details),
            priority = COALESCE($2, priority),
            deadline = COALESCE($3, deadline),
            bay_id = COALESCE($4, bay_id)
        WHERE id = $5
        RETURNING *;
    `;
    const result = await db.query(query, [complaint_details, priority, deadline, bay_id, jobId]);
    return result.rows[0];
};

// 6. Inspection save karna
const saveInspection = async (jobId, inspectionData) => {
    const { checklist_data, faults_found, mechanic_notes } = inspectionData;
    const query = `
        INSERT INTO job_inspections (job_card_id, checklist_data, faults_found, mechanic_notes)
        VALUES ($1, $2, $3, $4) RETURNING *;
    `;
    const result = await db.query(query, [
        jobId,
        JSON.stringify(checklist_data),
        faults_found || null,
        mechanic_notes || null
    ]);
    return result.rows[0];
};

// 7. Status update karne aur Log save karne ka function (Timestamps ke sath)
const updateJobStatus = async (jobId, newStatus, changedBy) => {
    const currentJob = await db.query('SELECT * FROM job_cards WHERE id = $1', [jobId]);
    if (currentJob.rows.length === 0) throw new Error("Job not found");
    const job = currentJob.rows[0];
    const oldStatus = job.status;

    const setStarted = ['Inspection', 'In-Repair'].includes(newStatus) && !job.started_at;
    const setCompleted = newStatus === 'Completed';

    const updateQuery = `
        UPDATE job_cards
        SET 
            status = $1,
            started_at = CASE WHEN $2 THEN CURRENT_TIMESTAMP ELSE started_at END,
            completed_at = CASE WHEN $3 THEN CURRENT_TIMESTAMP ELSE completed_at END
        WHERE id = $4
        RETURNING *;
    `;
    const updatedJob = await db.query(updateQuery, [newStatus, setStarted, setCompleted, jobId]);

    const logQuery = `
        INSERT INTO job_status_log (job_card_id, old_status, new_status, changed_by)
        VALUES ($1, $2, $3, $4) RETURNING *;
    `;
    await db.query(logQuery, [jobId, oldStatus, newStatus, changedBy]);

    return updatedJob.rows[0];
};

// 8. Job Photo save karna (caption ke sath)
const saveJobPhoto = async (jobId, photoUrl, uploadedBy, caption = null) => {
    const query = `
        INSERT INTO job_photos (job_card_id, photo_url, caption, uploaded_by)
        VALUES ($1, $2, $3, $4) RETURNING *;
    `;
    const result = await db.query(query, [jobId, photoUrl, caption, uploadedBy]);
    return result.rows[0];
};

// 9. Vehicle ki maintenance history nikalna
const getVehicleHistory = async (vehicleId) => {
    const query = `
        SELECT 
            jc.id AS job_card_id,
            jc.complaint_details,
            jc.status,
            jc.created_at,
            jc.completed_at,
            ji.faults_found,
            ji.mechanic_notes,
            i.labour_cost,
            i.parts_cost,
            i.pickup_fee,
            i.total_amount,
            i.status AS invoice_status
        FROM job_cards jc
        LEFT JOIN job_inspections ji ON jc.id = ji.job_card_id
        LEFT JOIN invoices i ON jc.id = i.job_card_id
        WHERE jc.vehicle_id = $1 AND jc.status = 'Completed'
        ORDER BY jc.completed_at DESC NULLS LAST, jc.created_at DESC;
    `;
    const result = await db.query(query, [vehicleId]);
    return result.rows;
};

// 10. Mechanic Dashboard ka complete data lana
const getMechanicDashboard = async (workerId, userId) => {
    const jobsQuery = `
        SELECT * FROM job_cards
        WHERE assigned_worker_id = $1 AND status NOT IN ('Completed', 'Cancelled')
        ORDER BY deadline ASC NULLS LAST, created_at DESC;
    `;
    const jobsResult = await db.query(jobsQuery, [workerId]);

    const attendanceQuery = `
        SELECT * FROM worker_attendance
        WHERE worker_id = $1 AND date = CURRENT_DATE
        ORDER BY check_in_time DESC LIMIT 1;
    `;
    const attendanceResult = await db.query(attendanceQuery, [workerId]);

    // Pending requisitions (Roman ke table se - safe fallback agar table abhi nahi bana)
    let pendingRequisitions = [];
    try {
        const reqRes = await db.query(
            `SELECT * FROM parts_requisitions WHERE requested_by = $1 AND status = 'Pending' ORDER BY requested_at DESC`,
            [workerId]
        );
        pendingRequisitions = reqRes.rows;
    } catch {
        pendingRequisitions = [];
    }

    // Notifications (Aniqa ke table se - safe fallback agar table abhi nahi bana)
    let notifications = [];
    try {
        const notifRes = await db.query(
            `SELECT * FROM notifications WHERE user_id = $1 AND is_read = FALSE ORDER BY created_at DESC LIMIT 10`,
            [userId]
        );
        notifications = notifRes.rows;
    } catch {
        notifications = [];
    }

    return {
        activeJobs: jobsResult.rows,
        todayAttendance: attendanceResult.rows[0] || null,
        pendingRequisitions,
        notifications
    };
};

// 11. Job ID se Job nikalna
const getJobById = async (jobId) => {
    const result = await db.query('SELECT * FROM job_cards WHERE id = $1', [jobId]);
    return result.rows[0];
};

// Helper: user_id se worker nikalna
const getWorkerByUserId = async (userId) => {
    const result = await db.query('SELECT * FROM workers WHERE user_id = $1', [userId]);
    return result.rows[0];
};

module.exports = {
    createJobCard,
    assignJobCard,
    getMechanicJobs,
    getJobDetails,
    updateJobDetails,
    saveInspection,
    updateJobStatus,
    saveJobPhoto,
    getVehicleHistory,
    getMechanicDashboard,
    getJobById,
    getWorkerByUserId
};