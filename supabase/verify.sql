-- Verificación manual de SIS en Supabase SQL Editor.
-- Ejecutar después de aplicar 0001_sis_base.sql, 0002_file_workspaces.sql y 0003_ai_action_proposals.sql.

select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'entities','entity_relationships','entity_documents','missions','projects','tasks',
    'metrics','metric_values','internal_accounts','account_balances','operation_events',
    'audit_events','record_revisions','resource_folders','resources','ai_concepts',
    'ai_concept_revisions'
  )
order by table_name;

select schemaname, tablename, rowsecurity
from pg_tables
where schemaname in ('public','private')
  and tablename in (
    'entities','entity_relationships','entity_documents','missions','projects','tasks',
    'metrics','metric_values','internal_accounts','account_balances','operation_events',
    'audit_events','record_revisions','resource_folders','resources','ai_concepts',
    'ai_concept_revisions','ai_action_proposals'
  )
order by schemaname, tablename;

select schemaname, tablename, policyname, cmd
from pg_policies
where schemaname in ('public','private')
order by schemaname, tablename, policyname;

select id, name, public
from storage.buckets
where id = 'sis-private';
