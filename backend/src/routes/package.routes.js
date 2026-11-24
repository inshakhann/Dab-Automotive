const express = require("express");
const packageController = require("../controllers/package.controller");

const router = express.Router();

router.get("/", packageController.getAllPackages);
router.get("/:id", packageController.getPackageById);
router.post("/", packageController.createPackage);

module.exports = router;
