CREATE TABLE reminders (
    reminder_id SERIAL PRIMARY KEY,
    booking_id INTEGER NOT NULL REFERENCES service_bookings(booking_id) ON DELETE CASCADE,
    reminder_type VARCHAR(20) NOT NULL
        CHECK (reminder_type IN ('24_hours', '2_hours')),
    scheduled_at TIMESTAMPTZ NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'sent', 'cancelled', 'failed')),
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (booking_id, reminder_type)
);

CREATE INDEX reminders_pending_schedule_index
ON reminders (scheduled_at)
WHERE status = 'pending';
