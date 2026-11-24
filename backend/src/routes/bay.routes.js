const express = require("express");
const bayController = require("../controllers/bay.controller");

const router = express.Router();

router.get("/", bayController.getAllBays);
router.post("/", bayController.createBay);

module.exports = router;
