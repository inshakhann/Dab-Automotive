const express = require("express");
const packageController = require("../controllers/package.controller");
const validate = require("../middleware/validate");
const {
  packageIdValidation,
  createPackageValidation,
} = require("../modules/packages/package.validation");

const router = express.Router();

router.get("/", packageController.getAllPackages);
router.get("/:id", packageIdValidation, validate, packageController.getPackageById);
router.post("/", createPackageValidation, validate, packageController.createPackage);

module.exports = router;