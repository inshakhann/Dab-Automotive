const express = require("express");
const vehicleController = require("./vehicle.controller");
const authenticate = require("../../middleware/authenticate");
const validate = require("../../middleware/validate");
const {
  vehicleIdParamValidation,
  createVehicleValidation,
  updateVehicleValidation,
} = require("./vehicle.validation");

const router = express.Router();

router.use(authenticate);

router.get("/", vehicleController.getMyVehicles);
router.get("/:vehicleId/history", vehicleIdParamValidation, validate, vehicleController.getVehicleHistory);
router.post("/", createVehicleValidation, validate, vehicleController.addVehicle);
router.patch("/:vehicleId", updateVehicleValidation, validate, vehicleController.updateMyVehicle);
router.delete("/:vehicleId", vehicleIdParamValidation, validate, vehicleController.deleteMyVehicle);

module.exports = router;