SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'handle_updated_at';