CREATE TABLE service_bookings (
    booking_id SERIAL PRIMARY KEY,
    booking_reference VARCHAR(30) NOT NULL UNIQUE,
    customer_id INTEGER NOT NULL REFERENCES customers(customer_id),
    vehicle_id INTEGER NOT NULL REFERENCES vehicles(vehicle_id),
    package_id INTEGER NOT NULL REFERENCES service_packages(package_id),
    bay_id INTEGER REFERENCES workshop_bays(bay_id),
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'confirmed'
        CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (end_time > start_time)
);

CREATE INDEX bookings_customer_index
ON service_bookings (customer_id);

CREATE INDEX bookings_bay_time_index
ON service_bookings (bay_id, start_time, end_time);

CREATE INDEX bookings_status_index
ON service_bookings (status);
