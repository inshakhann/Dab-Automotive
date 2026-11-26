const { body, param } = require("express-validator");

const vehicleIdParamValidation = [
  param("vehicleId")
    .isInt({ min: 1, max: 2147483647 })
    .withMessage("Valid vehicle ID is required"),
];

const createVehicleValidation = [
  body("make")
    .isString()
    .withMessage("Make is required")
    .trim()
    .notEmpty()
    .withMessage("Make cannot be empty")
    .isLength({ max: 100 })
    .withMessage("Make cannot exceed 100 characters"),
  body("model")
    .isString()
    .withMessage("Model is required")
    .trim()
    .notEmpty()
    .withMessage("Model cannot be empty")
    .isLength({ max: 100 })
    .withMessage("Model cannot exceed 100 characters"),
  body("year")
    .isInt({ min: 1886, max: 2100 })
    .withMessage("Year must be between 1886 and 2100"),
  body("plate_no")
    .isString()
    .withMessage("Plate number is required")
    .trim()
    .notEmpty()
    .withMessage("Plate number cannot be empty")
    .isLength({ max: 30 })
    .withMessage("Plate number cannot exceed 30 characters"),
  body("fuel_type")
    .optional({ nullable: true })
    .isString()
    .withMessage("Fuel type must be text")
    .trim()
    .isLength({ max: 30 })
    .withMessage("Fuel type cannot exceed 30 characters"),
  body("mileage")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Mileage must be 0 or greater"),
];

const updateVehicleValidation = [
  ...vehicleIdParamValidation,
  body("make").optional().isString().trim().notEmpty().withMessage("Make cannot be empty"),
  body("model").optional().isString().trim().notEmpty().withMessage("Model cannot be empty"),
  body("year").optional().isInt({ min: 1886, max: 2100 }).withMessage("Year must be between 1886 and 2100"),
  body("plate_no").optional().isString().trim().notEmpty().withMessage("Plate number cannot be empty"),
  body("fuel_type").optional({ nullable: true }).isString().trim(),
  body("mileage").optional().isInt({ min: 0 }).withMessage("Mileage must be 0 or greater"),
];

module.exports = {
  vehicleIdParamValidation,
  createVehicleValidation,
  updateVehicleValidation,
};