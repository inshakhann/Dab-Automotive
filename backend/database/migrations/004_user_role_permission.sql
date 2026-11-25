INSERT INTO permissions (name, description)
VALUES (
  'users.change_role',
  'Change roles of existing approved users'
)
ON CONFLICT (name) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles AS r
CROSS JOIN permissions AS p
WHERE r.name IN ('owner', 'administrator')
  AND p.name = 'users.change_role'
ON CONFLICT (role_id, permission_id) DO NOTHING;