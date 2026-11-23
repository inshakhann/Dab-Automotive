CREATE TABLE customers (
    customer_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id),
    address TEXT,
    city VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE vehicles (
    vehicle_id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(customer_id),
    make VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    year INTEGER NOT NULL CHECK (year >= 1886 AND year <= 2100),
    plate_no VARCHAR(30) NOT NULL,
    fuel_type VARCHAR(30),
    mileage INTEGER NOT NULL DEFAULT 0 CHECK (mileage >= 0),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX vehicles_customer_plate_unique
ON vehicles (customer_id, LOWER(plate_no))
WHERE is_deleted = FALSE;

CREATE INDEX vehicles_customer_id_index
ON vehicles (customer_id);
