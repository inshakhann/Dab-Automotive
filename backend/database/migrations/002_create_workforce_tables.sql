-- ==========================================================
-- FILE: 002_create_workforce_tables.sql (PostgreSQL Version)
-- ==========================================================

-- Enums for PostgreSQL
CREATE TYPE worker_status AS ENUM ('Active', 'Inactive');
CREATE TYPE job_status AS ENUM ('Pending', 'Inspection', 'In-Repair', 'Quality-Check', 'Completed', 'Cancelled');
CREATE TYPE invoice_status AS ENUM ('Unpaid', 'Paid', 'Partial');

-- 1. WORKERS TABLE
CREATE TABLE IF NOT EXISTS workers (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    designation VARCHAR(50) NOT NULL,
    skills TEXT,
    status worker_status DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. WORKER ATTENDANCE TABLE
CREATE TABLE IF NOT EXISTS worker_attendance (
    id SERIAL PRIMARY KEY,
    worker_id INT NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    check_in_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    check_out_time TIMESTAMP NULL,
    is_late BOOLEAN DEFAULT FALSE
);

-- 3. JOB CARDS TABLE
CREATE TABLE IF NOT EXISTS job_cards (
    id SERIAL PRIMARY KEY,
    booking_id INT NOT NULL, 
    vehicle_id INT NOT NULL, 
    assigned_worker_id INT REFERENCES workers(id) ON DELETE SET NULL,
    complaint_details TEXT,
    status job_status DEFAULT 'Pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. JOB INSPECTIONS TABLE
CREATE TABLE IF NOT EXISTS job_inspections (
    id SERIAL PRIMARY KEY,
    job_card_id INT NOT NULL REFERENCES job_cards(id) ON DELETE CASCADE,
    checklist_data JSONB, 
    faults_found TEXT,
    mechanic_notes TEXT,
    inspected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. JOB PHOTOS TABLE
CREATE TABLE IF NOT EXISTS job_photos (
    id SERIAL PRIMARY KEY,
    job_card_id INT NOT NULL REFERENCES job_cards(id) ON DELETE CASCADE,
    photo_url VARCHAR(255) NOT NULL,
    uploaded_by INT NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. JOB STATUS LOG
CREATE TABLE IF NOT EXISTS job_status_log (
    id SERIAL PRIMARY KEY,
    job_card_id INT NOT NULL REFERENCES job_cards(id) ON DELETE CASCADE,
    old_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    changed_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. INVOICES TABLE
CREATE TABLE IF NOT EXISTS invoices (
    id SERIAL PRIMARY KEY,
    job_card_id INT NOT NULL REFERENCES job_cards(id) ON DELETE CASCADE,
    labour_cost DECIMAL(10,2) DEFAULT 0.00,
    parts_cost DECIMAL(10,2) DEFAULT 0.00,
    pickup_fee DECIMAL(10,2) DEFAULT 0.00,
    total_amount DECIMAL(10,2) NOT NULL,
    status invoice_status DEFAULT 'Unpaid',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    invoice_id INT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    amount_paid DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50) DEFAULT 'Cash', 
    paid_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);