-- Permissions for the user-management features added here.
INSERT INTO permissions (name, description)
VALUES
    ('users.read', 'View the application user list'),
    ('users.review_staff', 'Approve or reject pending staff accounts')
ON CONFLICT (name) DO NOTHING;

-- Grant these permissions to Owner and Administrator.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name IN ('owner', 'administrator')
  AND p.name IN ('users.read', 'users.review_staff')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Record sensitive administrative actions.
CREATE TABLE audit_logs (
    id BIGSERIAL PRIMARY KEY,
    actor_user_id INTEGER REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id INTEGER,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX audit_logs_created_at_index
ON audit_logs (created_at DESC);