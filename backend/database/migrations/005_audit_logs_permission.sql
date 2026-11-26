INSERT INTO permissions (name, description)
VALUES (
  'audit_logs.read',
  'View and filter audit logs'
)
ON CONFLICT (name) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles AS r
CROSS JOIN permissions AS p
WHERE r.name = 'administrator'
  AND p.name = 'audit_logs.read'
ON CONFLICT (role_id, permission_id) DO NOTHING;