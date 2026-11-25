const express = require("express");
const pickupController = require("../controllers/pickup.controller");
const authenticate = require("../middleware/authenticate");

const router = express.Router();

router.use(authenticate);

router.post("/", pickupController.createPickupRequest);

module.exports = router;
