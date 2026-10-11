-- Read-only deployment audit. Run with an authorized operator in Supabase SQL editor.
-- Do not paste query results containing user data into issues or public reports.
select c.relname as table_name, c.relrowsecurity as rls_enabled
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname in
('profiles','attempts','sessions','snapshots','learning_state');

select tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public' and tablename in
('profiles','attempts','sessions','snapshots','learning_state');

-- Verify foreign-key deletion behavior without reading records.
select conrelid::regclass as source_table, confrelid::regclass as target_table,
       pg_get_constraintdef(oid) as definition
from pg_constraint where contype = 'f' and confrelid = 'auth.users'::regclass;
