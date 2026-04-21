-- Debug migration to see current users
CREATE TABLE IF NOT EXISTS debug_users (
  id uuid,
  email text,
  full_name text
);

TRUNCATE debug_users;

INSERT INTO debug_users (id, email, full_name)
SELECT id, email, raw_user_meta_data->>'full_name'
FROM auth.users;
