INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
VALUES
('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'admin@campusstay.co', crypt('ChangeMe123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"CampusStay Admin","role":"admin","phone":"+255700000001"}', now(), now(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'lister.owner@campusstay.co', crypt('ChangeMe123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Asha Owner","role":"lister","lister_type":"owner","phone":"+255700000101"}', now(), now(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'lister.manager@campusstay.co', crypt('ChangeMe123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Baraka Manager","role":"lister","lister_type":"manager","phone":"+255700000102"}', now(), now(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'student.one@campusstay.co', crypt('ChangeMe123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Neema Student","role":"student","phone":"+255700000201"}', now(), now(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'student.two@campusstay.co', crypt('ChangeMe123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Juma Student","role":"student","phone":"+255700000202"}', now(), now(), '', '', '', '')
ON CONFLICT (id) DO NOTHING;

UPDATE public.profiles p
SET 
  phone = (SELECT raw_user_meta_data->>'phone' FROM auth.users u WHERE u.id = p.id),
  full_name = (SELECT raw_user_meta_data->>'full_name' FROM auth.users u WHERE u.id = p.id),
  role = CAST((SELECT raw_user_meta_data->>'role' FROM auth.users u WHERE u.id = p.id) AS app_role),
  verification_status = 'verified'::verification_status
WHERE role IS NULL OR role = 'student'::app_role;
