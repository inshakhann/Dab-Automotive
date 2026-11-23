const express = require("express");
const customerController = require("../controllers/customer.controller");

const router = express.Router();

router.get("/me", customerController.getMyProfile);
router.post("/me", customerController.createMyProfile);
router.patch("/me", customerController.updateMyProfile);

module.exports = router;
