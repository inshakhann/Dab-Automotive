const express = require("express");
const vehicleController = require("../controllers/vehicle.controller");
const authenticate = require("../middleware/authenticate");

const router = express.Router();

router.use(authenticate);

router.get("/", vehicleController.getMyVehicles);
router.post("/", vehicleController.addVehicle);
router.patch("/:vehicleId", vehicleController.updateMyVehicle);
router.delete("/:vehicleId", vehicleController.deleteMyVehicle);

module.exports = router;
