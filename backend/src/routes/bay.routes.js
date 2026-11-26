const express = require("express");
const bayController = require("../controllers/bay.controller");
const validate = require("../middleware/validate");
const { createBayValidation } = require("../modules/bays/bay.validation");

const router = express.Router();

router.get("/", bayController.getAllBays);
router.post("/", createBayValidation, validate, bayController.createBay);

module.exports = router;