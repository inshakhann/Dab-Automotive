// FILE: src/modules/workforce/invoices/invoices.controller.js
const invoicesService = require('./invoices.service');
// File ke sabse upar yeh add karein
const PDFDocument = require('pdfkit');
// Invoice create karna
const createInvoice = async (req, res) => {
    try {
        const invoice = await invoicesService.createNewInvoice(req.body);
        res.status(201).json({ success: true, message: "Invoice generated", data: invoice });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Invoice dekhna
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

// Payment record karna
const makePayment = async (req, res) => {
    try {
        const { invoiceId } = req.params;
        const paymentData = { ...req.body, invoice_id: invoiceId };
        const payment = await invoicesService.addPayment(paymentData);
        res.status(201).json({ success: true, message: "Payment recorded", data: payment });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
// Naya function: PDF Download
const downloadInvoicePDF = async (req, res) => {
    try {
        const { invoiceId } = req.params;
        const invoice = await invoicesService.getFullInvoice(invoiceId);

        if (!invoice) {
            return res.status(404).json({ success: false, message: "Invoice not found" });
        }

        // PDF Document banayein
        const doc = new PDFDocument();
        
        // Headers set karein taake browser file ko download kare
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=invoice-${invoiceId}.pdf`);
        
        // PDF ko response mein pipe karein
        doc.pipe(res);

        // PDF ka Content likhein
        doc.fontSize(20).text('Dab Automotive - Invoice', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Invoice ID: ${invoice.id}`);
        doc.text(`Job Card ID: ${invoice.job_card_id}`);
        doc.text(`Vehicle ID: ${invoice.vehicle_id}`);
        doc.text(`Complaint: ${invoice.complaint_details}`);
        doc.moveDown();
        
        doc.text(`Labour Cost: PKR ${invoice.labour_cost}`);
        doc.text(`Parts Cost: PKR ${invoice.parts_cost}`);
        doc.text(`Pickup Fee: PKR ${invoice.pickup_fee}`);
        doc.fontSize(14).text(`Total Amount: PKR ${invoice.total_amount}`, { underline: true });
        doc.moveDown();
        doc.text(`Status: ${invoice.status}`);
        doc.text(`Date: ${new Date(invoice.created_at).toLocaleDateString()}`);

        // PDF ko end karein (Yeh bohat zaroori hai)
        doc.end();

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { createInvoice, getInvoice, makePayment, downloadInvoicePDF };