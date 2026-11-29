// FILE: src/modules/workforce/invoices/invoices.routes.js
const express = require('express');
const router = express.Router();
const invoicesController = require('./invoices.controller');
const authenticate = require('../../../middleware/authenticate');
const authorize = require('../../../middleware/authorize');
const validate = require('../../../middleware/validate');
const { createInvoiceValidation, paymentValidation } = require('../workforce.validation');

router.post('/create', authenticate, authorize('owner', 'administrator'), createInvoiceValidation, validate, invoicesController.createInvoice);
router.get('/:invoiceId', authenticate, authorize('customer', 'owner', 'administrator'), invoicesController.getInvoice);
router.post('/:invoiceId/payments', authenticate, authorize('owner', 'administrator'), paymentValidation, validate, invoicesController.makePayment);
router.get('/:invoiceId/pdf', authenticate, authorize('customer', 'owner', 'administrator'), invoicesController.downloadInvoicePDF);

module.exports = router;