// FILE: src/modules/workforce/workers/workers.repo.js
const db = require('../../../config/db'); // 3 steps peeche config/db.js hai

// 1. Naya Worker create karna
const createWorker = async (workerData) => {
    const { user_id, designation, skills } = workerData;
    const query = `
        INSERT INTO workers (user_id, designation, skills) 
        VALUES ($1, $2, $3) RETURNING *;
    `;
    const result = await db.query(query, [user_id, designation, skills]);
    return result.rows[0];
};

// 2. Saare workers lena
const getAllWorkers = async () => {
    const result = await db.query('SELECT * FROM workers ORDER BY created_at DESC');
    return result.rows;
};

// 3. Worker Check-in karna
const checkInWorker = async (workerId) => {
    // Check karein ke pehle se check-in toh nahi hai
    const checkQuery = `SELECT * FROM worker_attendance WHERE worker_id = $1 AND check_out_time IS NULL`;
    const checkResult = await db.query(checkQuery, [workerId]);
    
    if (checkResult.rows.length > 0) {
        throw new Error("Worker is already checked in!");
    }

    const query = `
        INSERT INTO worker_attendance (worker_id, date, check_in_time) 
        VALUES ($1, CURRENT_DATE, CURRENT_TIMESTAMP) RETURNING *;
    `;
    const result = await db.query(query, [workerId]);
    return result.rows[0];
};

// 4. Worker Check-out karna
const checkOutWorker = async (workerId) => {
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

module.exports = { 
    createWorker, 
    getAllWorkers,
    checkInWorker,
    checkOutWorker
};