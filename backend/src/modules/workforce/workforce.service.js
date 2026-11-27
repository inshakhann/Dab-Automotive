// FILE: src/modules/workforce/workforce.service.js
const workforceRepo = require('./workforce.repo'); // Yahan 'workforce.repo' likha hai

const addWorker = async (workerData) => {
    return await workforceRepo.createWorker(workerData);
};

const getWorkers = async () => {
    return await workforceRepo.getAllWorkers();
};

module.exports = { addWorker, getWorkers };
// Purane wale require ke sath yeh bhi import kar lein agar zaroorat ho

const checkIn = async (workerId) => {
    return await workforceRepo.checkInWorker(workerId);
};

const checkOut = async (workerId) => {
    return await workforceRepo.checkOutWorker(workerId);
};

module.exports = { 
    addWorker, 
    getWorkers,
    checkIn,
    checkOut
};