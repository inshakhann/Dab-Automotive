const express = require("express");
const pickupController = require("../controllers/pickup.controller");
const authenticate = require("../middleware/authenticate");
const validate = require("../middleware/validate");
const {
  estimatePickupValidation,
  createPickupValidation,
} = require("../modules/pickups/pickup.validation");

const router = express.Router();

router.use(authenticate);

router.post("/estimate", estimatePickupValidation, validate, pickupController.estimatePickup);
router.post("/", createPickupValidation, validate, pickupController.createPickupRequest);

module.exports = router;