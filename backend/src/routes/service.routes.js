const express = require("express");
const serviceController = require("../controllers/service.controller");
const validate = require("../middleware/validate");
const {
  serviceIdValidation,
  serviceBodyValidation,
} = require("../modules/services/service.validation");

const router = express.Router();

router.get("/", serviceController.getAllServices);
router.get("/:id", serviceIdValidation, validate, serviceController.getServiceById);
router.post("/", serviceBodyValidation, validate, serviceController.createService);
router.patch("/:id", serviceIdValidation, serviceBodyValidation, validate, serviceController.updateService);

module.exports = router;