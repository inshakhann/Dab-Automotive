CREATE TABLE service_packages (
    package_id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    estimated_duration INTEGER NOT NULL CHECK (estimated_duration > 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE package_services (
    package_id INTEGER NOT NULL REFERENCES service_packages(package_id) ON DELETE CASCADE,
    service_id INTEGER NOT NULL REFERENCES services(service_id),
    PRIMARY KEY (package_id, service_id)
);

CREATE INDEX service_packages_active_index
ON service_packages (is_active);
