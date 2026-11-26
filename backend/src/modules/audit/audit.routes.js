const express = require("express");

const authenticate = require("../../middleware/authenticate");
const authorize = require("../../middleware/authorize");
const validate = require("../../middleware/validate");

const auditValidation = require("./audit.validation");
const controller = require("./audit.controller");

const router = express.Router();

router.use(authenticate);
router.use(authorize("audit_logs.read"));

router.get("/", auditValidation, validate, controller.listAuditLogs);

module.exports = router;
