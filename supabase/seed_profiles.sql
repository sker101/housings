INSERT INTO public.profiles (id, full_name, role, phone, phone_verified, verification_status, subscription_plan)
SELECT 
    id, 
    raw_user_meta_data->>'full_name', 
    CAST(raw_user_meta_data->>'role' AS app_role), 
    raw_user_meta_data->>'phone',
    true,
    'verified'::verification_status,
    'free'::subscription_plan
FROM auth.users
ON CONFLICT (id) DO UPDATE SET 
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    phone = EXCLUDED.phone;
