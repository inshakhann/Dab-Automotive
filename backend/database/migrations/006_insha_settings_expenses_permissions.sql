-- New migrations only: migrations 001-005 are preserved for existing databases.
INSERT INTO permissions(name,description) VALUES
 ('users.create','Create an approved account'), ('users.edit','Edit another account profile'),
 ('settings.read','Read masked system settings'), ('settings.update','Update system settings'),
 ('expenses.read','Read expenses'), ('expenses.write','Create, edit and delete expenses'),
 ('reports.read','Read financial reports'), ('dashboard.read','Read role-specific administration dashboard')
ON CONFLICT(name) DO NOTHING;
INSERT INTO role_permissions(role_id,permission_id)
SELECT r.id,p.id FROM roles r CROSS JOIN permissions p
WHERE (r.name IN ('owner','administrator') AND p.name IN ('users.create','users.edit','expenses.read','reports.read','dashboard.read'))
 OR (r.name='owner' AND p.name='expenses.write')
 OR (r.name='administrator' AND p.name IN ('settings.read','settings.update'))
ON CONFLICT DO NOTHING;
CREATE TABLE system_settings (
 id SERIAL PRIMARY KEY, key VARCHAR(100) NOT NULL UNIQUE,
 is_secret BOOLEAN NOT NULL, value JSONB, encrypted_value TEXT,
 updated_by INTEGER REFERENCES users(id), updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CHECK ((is_secret AND value IS NULL) OR (NOT is_secret AND encrypted_value IS NULL))
);
CREATE TABLE expenses (
 id SERIAL PRIMARY KEY, title VARCHAR(150) NOT NULL, category VARCHAR(50) NOT NULL,
 amount NUMERIC(14,2) NOT NULL CHECK(amount > 0), currency CHAR(3) NOT NULL DEFAULT 'PKR' CHECK(currency='PKR'),
 expense_date DATE NOT NULL, notes VARCHAR(2000) NOT NULL DEFAULT '',
 created_by INTEGER NOT NULL REFERENCES users(id), updated_by INTEGER NOT NULL REFERENCES users(id),
 created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, deleted_at TIMESTAMPTZ
);
CREATE INDEX expenses_date_idx ON expenses(expense_date DESC,id DESC) WHERE deleted_at IS NULL;
CREATE INDEX audit_logs_actor_time_idx ON audit_logs(actor_user_id,created_at DESC,id DESC);
CREATE INDEX audit_logs_action_time_idx ON audit_logs(action,created_at DESC,id DESC);
