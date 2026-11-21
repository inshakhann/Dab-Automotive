-- 1. Roles available in the application.
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(30) NOT NULL UNIQUE
);

-- 2. Actions that can be assigned to roles.
CREATE TABLE permissions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT
);

-- 3. Connect roles with their permitted actions.
CREATE TABLE role_permissions (
    role_id INTEGER NOT NULL REFERENCES roles(id),
    permission_id INTEGER NOT NULL REFERENCES permissions(id),
    PRIMARY KEY (role_id, permission_id)
);

-- 4. User accounts.
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    password_hash TEXT NOT NULL,

    role_id INTEGER NOT NULL REFERENCES roles(id),

    -- Holds a staff role request until it is approved.
    requested_role_id INTEGER REFERENCES roles(id),

    status VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'pending', 'inactive', 'rejected')),

    preferred_language VARCHAR(5) NOT NULL DEFAULT 'en'
        CHECK (preferred_language IN ('en', 'ur')),

    failed_login_attempts INTEGER NOT NULL DEFAULT 0
        CHECK (failed_login_attempts >= 0),

    locked_until TIMESTAMPTZ,

    -- Increasing this value will invalidate older JWTs
    -- when the authentication middleware checks it.
    token_version INTEGER NOT NULL DEFAULT 0
        CHECK (token_version >= 0),

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Prevent duplicate emails even when letter case differs.
CREATE UNIQUE INDEX users_email_unique
ON users (LOWER(email));

-- 5. Password-reset OTP records.
CREATE TABLE otp_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Store a protected hash, never the actual OTP.
    otp_hash TEXT NOT NULL,

    attempts INTEGER NOT NULL DEFAULT 0
        CHECK (attempts >= 0),

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ NOT NULL
        DEFAULT (CURRENT_TIMESTAMP + INTERVAL '10 minutes'),

    used_at TIMESTAMPTZ,

    CHECK (expires_at > created_at)
);

CREATE INDEX otp_tokens_user_id_index
ON otp_tokens (user_id);

-- Initial application roles.
INSERT INTO roles (name)
VALUES
    ('customer'),
    ('mechanic'),
    ('store_manager'),
    ('owner'),
    ('administrator');