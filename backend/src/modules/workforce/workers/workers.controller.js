// FILE: src/modules/workforce/workers/workers.controller.js
const workersService = require('./workers.service');

const createWorker = async (req, res) => {
    try {
        const newWorker = await workersService.addWorker(req.body);
        res.status(201).json({ success: true, message: "Worker added successfully", data: newWorker });
    } catch (error) {
        const status = error.code === '23505' ? 409 : 500;
        res.status(status).json({ success: false, message: error.message });
    }
};

const getWorkers = async (req, res) => {
    try {
        const workers = await workersService.getWorkers();
        res.status(200).json({ success: true, data: workers });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const updateWorker = async (req, res) => {
    try {
        const updated = await workersService.editWorker(req.params.id, req.body);
        res.status(200).json({ success: true, message: "Worker updated successfully", data: updated });
    } catch (error) {
        const status = error.message === "Worker not found." ? 404 : 500;
        res.status(status).json({ success: false, message: error.message });
    }
};

const deleteWorker = async (req, res) => {
    try {
        const deactivated = await workersService.removeWorker(req.params.id);
        res.status(200).json({ success: true, message: "Worker deactivated successfully", data: deactivated });
    } catch (error) {
        const status = error.message === "Worker not found." ? 404 : 500;
        res.status(status).json({ success: false, message: error.message });
    }
};

const checkIn = async (req, res) => {
    try {
        const attendance = await workersService.checkIn(req.user, req.params.workerId);
        res.status(200).json({ success: true, message: "Checked in successfully", data: attendance });
    } catch (error) {
        res.status(error.statusCode || 400).json({ success: false, message: error.message });
    }
};

const checkOut = async (req, res) => {
    try {
        const attendance = await workersService.checkOut(req.user, req.params.workerId);
        res.status(200).json({ success: true, message: "Checked out successfully", data: attendance });
    } catch (error) {
        res.status(error.statusCode || 400).json({ success: false, message: error.message });
    }
};

module.exports = {
    createWorker,
    getWorkers,
    updateWorker,
    deleteWorker,
    checkIn,
    checkOut
};