ALTER TABLE reminders
  ADD COLUMN IF NOT EXISTS retry_count INTEGER NOT NULL DEFAULT 0 CHECK (retry_count >= 0),
  ADD COLUMN IF NOT EXISTS alert_date DATE NOT NULL DEFAULT CURRENT_DATE;

ALTER TABLE reminders
  DROP CONSTRAINT IF EXISTS reminders_reminder_type_check;

ALTER TABLE reminders
  ADD CONSTRAINT reminders_reminder_type_check
  CHECK (reminder_type IN ('24_hours', '2_hours', 'delayed_job', 'unconfirmed_booking'));

ALTER TABLE reminders
  DROP CONSTRAINT IF EXISTS reminders_booking_id_reminder_type_key;

CREATE UNIQUE INDEX IF NOT EXISTS reminders_booking_type_date_unique
  ON reminders (booking_id, reminder_type, alert_date);