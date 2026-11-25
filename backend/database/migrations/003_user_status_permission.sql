INSERT INTO permissions (name, description)
VALUES (
    'users.change_status',
    'Deactivate and reactivate approved user accounts'
)
ON CONFLICT (name) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name IN ('owner', 'administrator')
  AND p.name = 'users.change_status'
ON CONFLICT (role_id, permission_id) DO NOTHING;