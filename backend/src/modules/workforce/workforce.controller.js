// FILE: src/modules/workforce/workforce.controller.js
const workforceService = require('./workforce.service');

// 1. Worker create karne ka function
const createWorker = async (req, res) => {
    try {
        const newWorker = await workforceService.addWorker(req.body);
        res.status(201).json({ success: true, message: "Worker added successfully", data: newWorker });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 2. Saare workers lene ka function
const getWorkers = async (req, res) => {
    try {
        const workers = await workforceService.getWorkers();
        res.status(200).json({ success: true, data: workers });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 3. Check-in ka function
const checkIn = async (req, res) => {
    try {
        const { workerId } = req.params;
        const attendance = await workforceService.checkIn(workerId);
        res.status(200).json({ success: true, message: "Checked in successfully", data: attendance });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// 4. Check-out ka function
const checkOut = async (req, res) => {
    try {
        const { workerId } = req.params;
        const attendance = await workforceService.checkOut(workerId);
        res.status(200).json({ success: true, message: "Checked out successfully", data: attendance });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// 5. Aakhir mein SAARE functions ko export karein (Sirf ek dafa)
module.exports = { 
    createWorker, 
    getWorkers,
    checkIn, 
    checkOut 
};