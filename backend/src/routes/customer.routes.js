const express = require("express");
const customerController = require("../controllers/customer.controller");
const authenticate = require("../middleware/authenticate");

const router = express.Router();

router.use(authenticate);

router.get("/me", customerController.getMyProfile);
router.post("/me", customerController.createMyProfile);
router.patch("/me", customerController.updateMyProfile);

module.exports = router;
