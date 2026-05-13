-- Force reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
