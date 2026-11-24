const express = require("express");
const serviceController = require("../controllers/service.controller");

const router = express.Router();

router.get("/", serviceController.getAllServices);
router.get("/:id", serviceController.getServiceById);
router.post("/", serviceController.createService);
router.patch("/:id", serviceController.updateService);

module.exports = router;
