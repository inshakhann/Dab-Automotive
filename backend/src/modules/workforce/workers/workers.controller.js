// FILE: src/modules/workforce/workers/workers.controller.js
const workersService = require('./workers.service');

// Worker create karna
const createWorker = async (req, res) => {
    try {
        const newWorker = await workersService.addWorker(req.body);
        res.status(201).json({ success: true, message: "Worker added successfully", data: newWorker });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Saare workers lena
const getWorkers = async (req, res) => {
    try {
        const workers = await workersService.getWorkers();
        res.status(200).json({ success: true, data: workers });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Check-in
const checkIn = async (req, res) => {
    try {
        const { workerId } = req.params;
        const attendance = await workersService.checkIn(workerId);
        res.status(200).json({ success: true, message: "Checked in successfully", data: attendance });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// Check-out
const checkOut = async (req, res) => {
    try {
        const { workerId } = req.params;
        const attendance = await workersService.checkOut(workerId);
        res.status(200).json({ success: true, message: "Checked out successfully", data: attendance });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

module.exports = { 
    createWorker, 
    getWorkers,
    checkIn,
    checkOut
};