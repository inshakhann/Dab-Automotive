-- ==========================================================
-- FILE: database/migrations/003_update_workforce_schema.sql
-- ==========================================================

-- 1. WORKERS TABLE UPDATES (ERD Alignment)
ALTER TABLE workers
    ADD COLUMN IF NOT EXISTS shift_start TIME DEFAULT '09:00:00',
    ADD COLUMN IF NOT EXISTS shift_end TIME DEFAULT '18:00:00';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'workers_user_id_unique'
    ) THEN
        ALTER TABLE workers ADD CONSTRAINT workers_user_id_unique UNIQUE (user_id);
    END IF;
END $$;

-- 2. WORKER ATTENDANCE UPDATES
ALTER TABLE worker_attendance
    ADD COLUMN IF NOT EXISTS hours_worked DECIMAL(5,2) DEFAULT 0.00;

-- 3. JOB CARDS UPDATES (Bay, Priority, Deadline, Timestamps & Full State Machine)
ALTER TABLE job_cards
    ADD COLUMN IF NOT EXISTS bay_id INT,
    ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'Normal'
        CHECK (priority IN ('Low', 'Normal', 'High', 'Urgent')),
    ADD COLUMN IF NOT EXISTS deadline TIMESTAMP,
    ADD COLUMN IF NOT EXISTS started_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;

-- Enum ko VARCHAR + CHECK mein convert karein taake 'Assigned' aur 'AwaitingParts' bhi support hon
ALTER TABLE job_cards ALTER COLUMN status DROP DEFAULT;
ALTER TABLE job_cards ALTER COLUMN status TYPE VARCHAR(30) USING status::text;
ALTER TABLE job_cards ALTER COLUMN status SET DEFAULT 'Pending';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'job_cards_status_check'
    ) THEN
        ALTER TABLE job_cards ADD CONSTRAINT job_cards_status_check
            CHECK (status IN (
                'Pending',
                'Assigned',
                'Inspection',
                'AwaitingParts',
                'In-Repair',
                'Quality-Check',
                'Completed',
                'Cancelled'
            ));
    END IF;
END $$;

-- 4. JOB PHOTOS UPDATES
ALTER TABLE job_photos
    ADD COLUMN IF NOT EXISTS caption VARCHAR(255);

-- 5. INVOICES & PAYMENTS UPDATES
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'invoices_job_card_unique'
    ) THEN
        ALTER TABLE invoices ADD CONSTRAINT invoices_job_card_unique UNIQUE (job_card_id);
    END IF;
END $$;

ALTER TABLE payments
    ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'Paid',
    ADD COLUMN IF NOT EXISTS received_by INT REFERENCES users(id) ON DELETE SET NULL;