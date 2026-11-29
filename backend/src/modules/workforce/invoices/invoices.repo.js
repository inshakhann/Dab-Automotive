// FILE: src/modules/workforce/invoices/invoices.repo.js
const db = require('../../../config/db');

// 1. Naya Invoice banana (pickup_fee aur auto-total ke sath)
const createInvoice = async (invoiceData) => {
    const { job_card_id, labour_cost = 0, parts_cost = 0, pickup_fee = 0 } = invoiceData;
    const total_amount = Number(labour_cost) + Number(parts_cost) + Number(pickup_fee);

    const query = `
        INSERT INTO invoices (job_card_id, labour_cost, parts_cost, pickup_fee, total_amount)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (job_card_id) DO NOTHING
        RETURNING *;
    `;
    const result = await db.query(query, [job_card_id, labour_cost, parts_cost, pickup_fee, total_amount]);
    if (result.rows.length === 0) {
        const existing = await db.query('SELECT * FROM invoices WHERE job_card_id = $1', [job_card_id]);
        return existing.rows[0];
    }
    return result.rows[0];
};

// 2. Invoice ID se invoice + payments history dekhna
const getInvoiceById = async (invoiceId) => {
    const query = `
        SELECT 
            i.*, 
            jc.vehicle_id, 
            jc.complaint_details,
            COALESCE(
                (SELECT json_agg(p ORDER BY p.paid_at ASC) FROM payments p WHERE p.invoice_id = i.id),
                '[]'::json
            ) AS payments
        FROM invoices i
        JOIN job_cards jc ON i.job_card_id = jc.id
        WHERE i.id = $1;
    `;
    const result = await db.query(query, [invoiceId]);
    return result.rows[0];
};

// 3. Payment record karna (ACID Transaction + Cumulative Sum)
const recordPayment = async (paymentData) => {
    const { invoice_id, amount_paid, payment_method = 'Cash', received_by = null } = paymentData;
    const client = await db.connect();

    try {
        await client.query('BEGIN');

        const invoiceRes = await client.query(
            'SELECT id, total_amount, status FROM invoices WHERE id = $1 FOR UPDATE',
            [invoice_id]
        );
        if (invoiceRes.rows.length === 0) {
            const err = new Error("Invoice not found.");
            err.statusCode = 404;
            throw err;
        }

        const invoice = invoiceRes.rows[0];
        if (invoice.status === 'Paid') {
            const err = new Error("Invoice is already fully paid.");
            err.statusCode = 400;
            throw err;
        }

        const insertQuery = `
            INSERT INTO payments (invoice_id, amount_paid, payment_method, status, received_by)
            VALUES ($1, $2, $3, 'Paid', $4)
            RETURNING *;
        `;
        const paymentResult = await client.query(insertQuery, [
            invoice_id,
            amount_paid,
            payment_method,
            received_by
        ]);

        const sumRes = await client.query(
            'SELECT COALESCE(SUM(amount_paid), 0) AS total_paid FROM payments WHERE invoice_id = $1',
            [invoice_id]
        );
        const totalPaid = Number(sumRes.rows[0].total_paid);
        const newStatus = totalPaid >= Number(invoice.total_amount) ? 'Paid' : 'Partial';

        await client.query(
            'UPDATE invoices SET status = $1 WHERE id = $2',
            [newStatus, invoice_id]
        );

        await client.query('COMMIT');
        return {
            payment: paymentResult.rows[0],
            invoice_status: newStatus,
            total_paid: totalPaid,
            remaining_balance: Math.max(0, Number(invoice.total_amount) - totalPaid)
        };
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

// 4. PDF ke liye complete invoice details
const getFullInvoiceDetails = async (invoiceId) => {
    const query = `
        SELECT 
            i.*,
            jc.complaint_details,
            jc.vehicle_id,
            jc.completed_at
        FROM invoices i
        JOIN job_cards jc ON i.job_card_id = jc.id
        WHERE i.id = $1;
    `;
    const result = await db.query(query, [invoiceId]);
    return result.rows[0];
};

module.exports = { createInvoice, getInvoiceById, recordPayment, getFullInvoiceDetails };