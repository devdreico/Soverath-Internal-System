-- Migración aditiva: nodos curados de Roadmap.
-- Aplicar después de 0001/0002/0003/0004.

create table if not exists public.roadmap_nodes (
  id uuid primary key default gen_random_uuid(),
  node_type text not null check (node_type in ('objective','goal','milestone')),
  title text not null,
  description text,
  status text not null default 'planned' check (status in ('planned','in_progress','completed','blocked')),
  occurred_on date,
  entity_id uuid references public.entities(id) on delete set null,
  mission_id uuid references public.missions(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  provenance text not null default 'founder_confirmed',
  source_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.roadmap_nodes enable row level security;

create policy roadmap_nodes_founder_all on public.roadmap_nodes
for all to authenticated
using ((select private.is_founder()))
with check ((select private.is_founder()));

create policy roadmap_nodes_require_aal2 on public.roadmap_nodes
as restrictive for all to authenticated
using ((select auth.jwt() ->> 'aal') = 'aal2')
with check ((select auth.jwt() ->> 'aal') = 'aal2');

create trigger roadmap_nodes_touch_updated_at
before update on public.roadmap_nodes
for each row execute function private.touch_updated_at();
