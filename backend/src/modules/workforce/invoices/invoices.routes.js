// FILE: src/modules/workforce/invoices/invoices.routes.js
const express = require('express');
const router = express.Router();
const invoicesController = require('./invoices.controller');
const authenticate = require('../../../middleware/authenticate'); 

// Routes
router.post('/create', authenticate, invoicesController.createInvoice);
router.get('/:invoiceId', authenticate, invoicesController.getInvoice);
router.post('/:invoiceId/payments', authenticate, invoicesController.makePayment);
// PDF Download Route
router.get('/:invoiceId/pdf', authenticate, invoicesController.downloadInvoicePDF);
module.exports = router;