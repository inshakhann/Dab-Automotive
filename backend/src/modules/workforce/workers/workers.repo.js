// FILE: src/modules/workforce/workers/workers.repo.js
const db = require('../../../config/db');

// 1. Naya Worker create karna
const createWorker = async (workerData) => {
    const { user_id, designation, skills, shift_start = '09:00:00', shift_end = '18:00:00' } = workerData;
    const query = `
        INSERT INTO workers (user_id, designation, skills, shift_start, shift_end)
        VALUES ($1, $2, $3, $4, $5) RETURNING *;
    `;
    const result = await db.query(query, [user_id, designation, skills || null, shift_start, shift_end]);
    return result.rows[0];
};

// 2. Saare workers lena (User profile + performance summary ke sath)
const getAllWorkers = async () => {
    const query = `
        SELECT 
            w.*,
            u.full_name,
            u.email,
            u.phone,
            COUNT(DISTINCT jc.id) FILTER (WHERE jc.status = 'Completed') AS completed_jobs,
            COUNT(DISTINCT jc.id) FILTER (WHERE jc.status NOT IN ('Completed', 'Cancelled')) AS active_jobs
        FROM workers w
        JOIN users u ON w.user_id = u.id
        LEFT JOIN job_cards jc ON jc.assigned_worker_id = w.id
        GROUP BY w.id, u.full_name, u.email, u.phone
        ORDER BY w.created_at DESC;
    `;
    const result = await db.query(query);
    return result.rows;
};

// 3. Worker Update karna
const updateWorker = async (workerId, updateData) => {
    const { designation, skills, shift_start, shift_end, status } = updateData;
    const query = `
        UPDATE workers
        SET 
            designation = COALESCE($1, designation),
            skills = COALESCE($2, skills),
            shift_start = COALESCE($3, shift_start),
            shift_end = COALESCE($4, shift_end),
            status = COALESCE($5, status)
        WHERE id = $6
        RETURNING *;
    `;
    const result = await db.query(query, [designation, skills, shift_start, shift_end, status, workerId]);
    return result.rows[0];
};

// 4. Worker Soft Delete (Deactivate - history mehfooz rehti hai)
const deactivateWorker = async (workerId) => {
    const query = `
        UPDATE workers
        SET status = 'Inactive'
        WHERE id = $1
        RETURNING *;
    `;
    const result = await db.query(query, [workerId]);
    return result.rows[0];
};

// Helper: Logged-in user_id se worker record nikalna
const getWorkerByUserId = async (userId) => {
    const result = await db.query('SELECT * FROM workers WHERE user_id = $1', [userId]);
    return result.rows[0];
};

// 5. Worker Check-in karna (Late flag calculation ke sath)
const checkInWorker = async (workerId) => {
    const workerRes = await db.query('SELECT * FROM workers WHERE id = $1 AND status = $2', [workerId, 'Active']);
    if (workerRes.rows.length === 0) {
        throw new Error("Active worker profile not found.");
    }
    const worker = workerRes.rows[0];

    const checkQuery = `SELECT * FROM worker_attendance WHERE worker_id = $1 AND check_out_time IS NULL`;
    const checkResult = await db.query(checkQuery, [workerId]);
    if (checkResult.rows.length > 0) {
        throw new Error("Worker is already checked in!");
    }

    const shiftStart = worker.shift_start || '09:00:00';
    const query = `
        INSERT INTO worker_attendance (worker_id, date, check_in_time, is_late)
        VALUES ($1, CURRENT_DATE, CURRENT_TIMESTAMP, (CURRENT_TIME > $2::time))
        RETURNING *;
    `;
    const result = await db.query(query, [workerId, shiftStart]);
    return result.rows[0];
};

// 6. Worker Check-out karna (Hours worked calculation ke sath)
const checkOutWorker = async (workerId) => {
    const query = `
        UPDATE worker_attendance
        SET 
            check_out_time = CURRENT_TIMESTAMP,
            hours_worked = ROUND(EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - check_in_time)) / 3600.0, 2)
        WHERE worker_id = $1 AND check_out_time IS NULL
        RETURNING *;
    `;
    const result = await db.query(query, [workerId]);

    if (result.rows.length === 0) {
        throw new Error("No active check-in found for this worker.");
    }
    return result.rows[0];
};

module.exports = {
    createWorker,
    getAllWorkers,
    updateWorker,
    deactivateWorker,
    getWorkerByUserId,
    checkInWorker,
    checkOutWorker
};