// FILE: src/modules/workforce/workers/workers.service.js
const workersRepo = require('./workers.repo');

const addWorker = async (workerData) => {
    return await workersRepo.createWorker(workerData);
};

const getWorkers = async () => {
    return await workersRepo.getAllWorkers();
};

const editWorker = async (workerId, updateData) => {
    const updated = await workersRepo.updateWorker(workerId, updateData);
    if (!updated) throw new Error("Worker not found.");
    return updated;
};

const removeWorker = async (workerId) => {
    const deactivated = await workersRepo.deactivateWorker(workerId);
    if (!deactivated) throw new Error("Worker not found.");
    return deactivated;
};

const resolveWorkerId = async (user, paramWorkerId) => {
    if (user.role === 'mechanic') {
        const worker = await workersRepo.getWorkerByUserId(user.id);
        if (!worker) throw new Error("Worker profile not linked to your account.");
        if (paramWorkerId && Number(paramWorkerId) !== worker.id) {
            const err = new Error("You can only mark your own attendance.");
            err.statusCode = 403;
            throw err;
        }
        return worker.id;
    }
    return Number(paramWorkerId);
};

const checkIn = async (user, paramWorkerId) => {
    const workerId = await resolveWorkerId(user, paramWorkerId);
    return await workersRepo.checkInWorker(workerId);
};

const checkOut = async (user, paramWorkerId) => {
    const workerId = await resolveWorkerId(user, paramWorkerId);
    return await workersRepo.checkOutWorker(workerId);
};

module.exports = {
    addWorker,
    getWorkers,
    editWorker,
    removeWorker,
    checkIn,
    checkOut
};