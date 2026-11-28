// FILE: src/modules/workforce/invoices/invoices.service.js
const invoicesRepo = require('./invoices.repo');

const createNewInvoice = async (invoiceData) => {
    // Yahan hum future mein check kar sakte hain ke kya is job ka invoice pehle se bana hai?
    return await invoicesRepo.createInvoice(invoiceData);
};

const getInvoice = async (invoiceId) => {
    return await invoicesRepo.getInvoiceById(invoiceId);
};

const addPayment = async (paymentData) => {
    return await invoicesRepo.recordPayment(paymentData);
};
const getFullInvoice = async (invoiceId) => {
    return await invoicesRepo.getFullInvoiceDetails(invoiceId);
};

module.exports = { createNewInvoice, getInvoice, addPayment, getFullInvoice };