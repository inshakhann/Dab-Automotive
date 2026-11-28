// FILE: src/modules/workforce/workers/workers.service.js
const workersRepo = require('./workers.repo');

// Worker functions
const addWorker = async (workerData) => {
    return await workersRepo.createWorker(workerData);
};

const getWorkers = async () => {
    return await workersRepo.getAllWorkers();
};

// Attendance functions
const checkIn = async (workerId) => {
    return await workersRepo.checkInWorker(workerId);
};

const checkOut = async (workerId) => {
    return await workersRepo.checkOutWorker(workerId);
};

module.exports = { 
    addWorker, 
    getWorkers,
    checkIn,
    checkOut
};