const express = require("express");
const bayController = require("./bay.controller");
const validate = require("../../middleware/validate");
const { createBayValidation } = require("./bay.validation");

const router = express.Router();

router.get("/", bayController.getAllBays);
router.post("/", createBayValidation, validate, bayController.createBay);

module.exports = router;