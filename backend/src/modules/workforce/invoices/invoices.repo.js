// FILE: src/modules/workforce/invoices/invoices.repo.js
const db = require('../../../config/db');

// 1. Naya Invoice banane ka function
const createInvoice = async (invoiceData) => {
    const { job_card_id, labour_cost, parts_cost, total_amount } = invoiceData;
    const query = `
        INSERT INTO invoices (job_card_id, labour_cost, parts_cost, total_amount) 
        VALUES ($1, $2, $3, $4) RETURNING *;
    `;
    const result = await db.query(query, [job_card_id, labour_cost, parts_cost, total_amount]);
    return result.rows[0];
};

// 2. Invoice ID se invoice dekhne ka function
const getInvoiceById = async (invoiceId) => {
    const query = `
        SELECT i.*, jc.vehicle_id, jc.complaint_details 
        FROM invoices i
        JOIN job_cards jc ON i.job_card_id = jc.id
        WHERE i.id = $1;
    `;
    const result = await db.query(query, [invoiceId]);
    return result.rows[0];
};

// 3. Payment record karne ka function
const recordPayment = async (paymentData) => {
    const { invoice_id, amount_paid, payment_method } = paymentData;
    
    // Payment insert karein
    const query = `
        INSERT INTO payments (invoice_id, amount_paid, payment_method) 
        VALUES ($1, $2, $3) RETURNING *;
    `;
    const result = await db.query(query, [invoice_id, amount_paid, payment_method]);

    // Invoice ka status update karein (agar fully paid hai toh 'Paid', warna 'Partial')
    const invoice = await db.query('SELECT total_amount FROM invoices WHERE id = $1', [invoice_id]);
    const total = invoice.rows[0].total_amount;
    
    if (amount_paid >= total) {
        await db.query(`UPDATE invoices SET status = 'Paid' WHERE id = $1`, [invoice_id]);
    } else {
        await db.query(`UPDATE invoices SET status = 'Partial' WHERE id = $1`, [invoice_id]);
    }

    return result.rows[0];
};

// 4. Invoice ki poori details lene ka function (PDF ke liye)
const getFullInvoiceDetails = async (invoiceId) => {
    const query = `
        SELECT 
            i.*, 
            jc.complaint_details,
            jc.vehicle_id
        FROM invoices i
        JOIN job_cards jc ON i.job_card_id = jc.id
        WHERE i.id = $1;
    `;
    const result = await db.query(query, [invoiceId]);
    return result.rows[0];
};


module.exports = { createInvoice, getInvoiceById, recordPayment, getFullInvoiceDetails };
