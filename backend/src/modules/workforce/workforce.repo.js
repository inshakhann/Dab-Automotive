// FILE: src/modules/workforce/workforce.repo.js
const db = require('../../config/db'); // Path check kar lein ke db.js kahan hai

const createWorker = async (workerData) => {
    const { user_id, designation, skills } = workerData;
    const query = `
        INSERT INTO workers (user_id, designation, skills) 
        VALUES ($1, $2, $3) RETURNING id, user_id, designation, skills;
    `;
    const result = await db.query(query, [user_id, designation, skills]);
    return result.rows[0];
};

const getAllWorkers = async () => {
    const result = await db.query('SELECT * FROM workers ORDER BY created_at DESC');
    return result.rows;
};

module.exports = { createWorker, getAllWorkers };
// Naya Worker Check-in karne ka function
const checkInWorker = async (workerId) => {
    // Pehle check karein ke worker ne pehle se check-in toh nahi kiya hua
    const checkQuery = `SELECT * FROM worker_attendance WHERE worker_id = $1 AND check_out_time IS NULL`;
    const checkResult = await db.query(checkQuery, [workerId]);
    
    if (checkResult.rows.length > 0) {
        throw new Error("Worker is already checked in!");
    }

    // Naya check-in record banayein
    const query = `
        INSERT INTO worker_attendance (worker_id, date, check_in_time) 
        VALUES ($1, CURRENT_DATE, CURRENT_TIMESTAMP) RETURNING *;
    `;
    const result = await db.query(query, [workerId]);
    return result.rows[0];
};

// Worker Check-out karne ka function
const checkOutWorker = async (workerId) => {
    // Woh record dhoondein jisme check-out nahi hua ho
    const query = `
        UPDATE worker_attendance 
        SET check_out_time = CURRENT_TIMESTAMP 
        WHERE worker_id = $1 AND check_out_time IS NULL 
        RETURNING *;
    `;
    const result = await db.query(query, [workerId]);
    
    if (result.rows.length === 0) {
        throw new Error("No active check-in found for this worker.");
    }
    return result.rows[0];
};

// Update exports
module.exports = { 
    createWorker, 
    getAllWorkers,
    checkInWorker,
    checkOutWorker
};