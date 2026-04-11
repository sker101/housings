-- Read-only checks: run in Supabase SQL Editor after migrations.
-- 1) Role distribution
SELECT role, COUNT(*) AS n FROM public.profiles GROUP BY role ORDER BY n DESC;

-- 2) Students must not be admin (investigate any rows)
SELECT id, full_name, email, role FROM public.profiles
WHERE role = 'admin'
ORDER BY created_at DESC
LIMIT 50;

-- 3) Dalali brokers stored as lister + lister_type (should use dalali routes when app resolves role)
SELECT id, full_name, role, lister_type, COUNT(*) OVER () AS sample_size
FROM public.profiles
WHERE role = 'lister' AND LOWER(COALESCE(lister_type, '')) = 'dalali'
LIMIT 20;

-- 4) is_admin() sanity (replace with a known non-admin user id to expect false)
-- SELECT public.is_admin('00000000-0000-0000-0000-000000000000'::uuid);
