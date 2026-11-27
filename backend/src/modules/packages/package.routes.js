const express = require("express");
const packageController = require("./package.controller");
const validate = require("../../middleware/validate");
const {
  packageIdValidation,
  createPackageValidation,
} = require("./package.validation");

const router = express.Router();

router.get("/", packageController.getAllPackages);
router.get("/:id", packageIdValidation, validate, packageController.getPackageById);
router.post("/", createPackageValidation, validate, packageController.createPackage);

module.exports = router;