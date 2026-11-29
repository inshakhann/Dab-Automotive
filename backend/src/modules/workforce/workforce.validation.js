// FILE: src/modules/workforce/workforce.validation.js
const { body, param } = require('express-validator');

// --- Worker Validations ---
const createWorkerValidation = [
    body('user_id').isInt({ min: 1 }).withMessage('Valid user_id is required.'),
    body('designation').trim().notEmpty().withMessage('Designation is required.'),
    body('skills').optional().isString(),
    body('shift_start').optional().matches(/^\d{2}:\d{2}(:\d{2})?$/).withMessage('Invalid shift_start time (HH:MM).'),
    body('shift_end').optional().matches(/^\d{2}:\d{2}(:\d{2})?$/).withMessage('Invalid shift_end time (HH:MM).')
];

const updateWorkerValidation = [
    param('id').isInt({ min: 1 }).withMessage('Valid worker ID is required.'),
    body('designation').optional().trim().notEmpty(),
    body('skills').optional().isString(),
    body('shift_start').optional().matches(/^\d{2}:\d{2}(:\d{2})?$/),
    body('shift_end').optional().matches(/^\d{2}:\d{2}(:\d{2})?$/),
    body('status').optional().isIn(['Active', 'Inactive']).withMessage('Status must be Active or Inactive.')
];

// --- Job Card Validations ---
const createJobValidation = [
    body('booking_id').isInt({ min: 1 }).withMessage('Valid booking_id is required.'),
    body('vehicle_id').isInt({ min: 1 }).withMessage('Valid vehicle_id is required.'),
    body('complaint_details').trim().notEmpty().withMessage('Complaint details are required.'),
    body('priority').optional().isIn(['Low', 'Normal', 'High', 'Urgent']),
    body('deadline').optional().isISO8601().withMessage('Deadline must be a valid ISO date.')
];

const assignJobValidation = [
    param('jobId').isInt({ min: 1 }).withMessage('Valid jobId is required.'),
    body('workerId').isInt({ min: 1 }).withMessage('Valid workerId is required.'),
    body('bayId').optional().isInt({ min: 1 }).withMessage('Valid bayId is required.')
];

const inspectionValidation = [
    param('jobId').isInt({ min: 1 }).withMessage('Valid jobId is required.'),
    body('checklist_data').isObject().withMessage('checklist_data must be a JSON object.'),
    body('faults_found').optional().isString(),
    body('mechanic_notes').optional().isString()
];

const statusUpdateValidation = [
    param('jobId').isInt({ min: 1 }).withMessage('Valid jobId is required.'),
    body('newStatus').isIn([
        'Pending', 'Assigned', 'Inspection', 'AwaitingParts', 'In-Repair', 'Quality-Check', 'Completed', 'Cancelled'
    ]).withMessage('Invalid job status.')
];

// --- Invoice & Payment Validations ---
const createInvoiceValidation = [
    body('job_card_id').isInt({ min: 1 }).withMessage('Valid job_card_id is required.'),
    body('labour_cost').optional().isFloat({ min: 0 }).withMessage('labour_cost must be >= 0.'),
    body('parts_cost').optional().isFloat({ min: 0 }).withMessage('parts_cost must be >= 0.'),
    body('pickup_fee').optional().isFloat({ min: 0 }).withMessage('pickup_fee must be >= 0.')
];

const paymentValidation = [
    param('invoiceId').isInt({ min: 1 }).withMessage('Valid invoiceId is required.'),
    body('amount_paid').isFloat({ gt: 0 }).withMessage('amount_paid must be greater than 0.'),
    body('payment_method').optional().isIn(['Cash', 'COD', 'Manual', 'Bank Transfer', 'Card'])
];

module.exports = {
    createWorkerValidation,
    updateWorkerValidation,
    createJobValidation,
    assignJobValidation,
    inspectionValidation,
    statusUpdateValidation,
    createInvoiceValidation,
    paymentValidation
};