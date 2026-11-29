// FILE: src/modules/workforce/invoices/invoices.controller.js
const invoicesService = require('./invoices.service');
const PDFDocument = require('pdfkit');

const createInvoice = async (req, res) => {
    try {
        const invoice = await invoicesService.createNewInvoice(req.body);
        res.status(201).json({ success: true, message: "Invoice generated", data: invoice });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const getInvoice = async (req, res) => {
    try {
        const { invoiceId } = req.params;
        const invoice = await invoicesService.getInvoice(invoiceId);
        if (!invoice) return res.status(404).json({ success: false, message: "Invoice not found" });
        res.status(200).json({ success: true, data: invoice });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const makePayment = async (req, res) => {
    try {
        const { invoiceId } = req.params;
        const paymentData = {
            ...req.body,
            invoice_id: invoiceId,
            received_by: req.user ? req.user.id : null
        };
        const result = await invoicesService.addPayment(paymentData);
        res.status(201).json({ success: true, message: "Payment recorded", data: result });
    } catch (error) {
        res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
};

const downloadInvoicePDF = async (req, res) => {
    try {
        const { invoiceId } = req.params;
        const invoice = await invoicesService.getFullInvoice(invoiceId);

        if (!invoice) {
            return res.status(404).json({ success: false, message: "Invoice not found" });
        }

        const doc = new PDFDocument({ margin: 50 });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=invoice-${invoiceId}.pdf`);

        doc.pipe(res);

        doc.fontSize(20).text('Dab Automotive - Service Invoice', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Invoice ID: #INV-${invoice.id}`);
        doc.text(`Job Card ID: #JC-${invoice.job_card_id}`);
        doc.text(`Vehicle ID: ${invoice.vehicle_id}`);
        doc.text(`Complaint: ${invoice.complaint_details || 'N/A'}`);
        doc.text(`Date: ${new Date(invoice.created_at).toLocaleDateString()}`);
        doc.moveDown();

        doc.text(`Labour Cost: PKR ${Number(invoice.labour_cost || 0).toFixed(2)}`);
        doc.text(`Parts Cost: PKR ${Number(invoice.parts_cost || 0).toFixed(2)}`);
        doc.text(`Pickup Fee: PKR ${Number(invoice.pickup_fee || 0).toFixed(2)}`);
        doc.moveDown(0.5);
        doc.fontSize(14).text(`Total Amount: PKR ${Number(invoice.total_amount).toFixed(2)}`, { underline: true });
        doc.moveDown();
        doc.fontSize(12).text(`Payment Status: ${invoice.status}`);

        doc.end();
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { createInvoice, getInvoice, makePayment, downloadInvoicePDF };