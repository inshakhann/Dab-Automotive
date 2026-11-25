CREATE TABLE booking_status_history (
    history_id SERIAL PRIMARY KEY,
    booking_id INTEGER NOT NULL REFERENCES service_bookings(booking_id) ON DELETE CASCADE,
    old_status VARCHAR(30),
    new_status VARCHAR(30) NOT NULL,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX booking_status_history_booking_index
ON booking_status_history (booking_id, changed_at);

CREATE OR REPLACE FUNCTION record_booking_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO booking_status_history (booking_id, old_status, new_status)
        VALUES (NEW.booking_id, NULL, NEW.status);
    ELSIF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO booking_status_history (booking_id, old_status, new_status)
        VALUES (NEW.booking_id, OLD.status, NEW.status);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER booking_status_history_trigger
AFTER INSERT OR UPDATE OF status ON service_bookings
FOR EACH ROW
EXECUTE FUNCTION record_booking_status_change();
