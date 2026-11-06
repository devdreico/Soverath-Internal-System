create table if not exists public.resource_folders (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.entities(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  area text not null check (area in ('gallery', 'documents', 'ai_concepts')),
  parent_folder_id uuid references public.resource_folders(id) on delete restrict,
  name text not null check (length(trim(name)) between 1 and 120),
  category text not null default 'general',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists resource_folders_scope_name_idx
on public.resource_folders (
  entity_id,
  area,
  coalesce(project_id, '00000000-0000-0000-0000-000000000000'::uuid),
  coalesce(parent_folder_id, '00000000-0000-0000-0000-000000000000'::uuid),
  lower(name)
);

create index if not exists resource_folders_entity_area_idx
on public.resource_folders (entity_id, area, sort_order, name);

alter table public.resources
  add column if not exists folder_id uuid references public.resource_folders(id) on delete set null,
  add column if not exists project_id uuid references public.projects(id) on delete set null,
  add column if not exists area text not null default 'documents' check (area in ('gallery', 'documents', 'ai_concepts')),
  add column if not exists category text not null default 'general',
  add column if not exists caption text not null default '',
  add column if not exists alt_text text not null default '',
  add column if not exists processing_status text not null default 'ready' check (processing_status in ('ready', 'pending', 'failed')),
  add column if not exists width_px integer,
  add column if not exists height_px integer,
  add column if not exists duration_ms bigint,
  add column if not exists checksum_sha256 text,
  add column if not exists updated_at timestamptz not null default now();

create index if not exists resources_folder_created_idx
on public.resources (folder_id, created_at desc);

create index if not exists resources_entity_area_created_idx
on public.resources (entity_id, area, created_at desc);

create or replace view public.resource_library_counts
with (security_invoker = true)
as
select entity_id, folder_id, area, count(*)::bigint as asset_count
from public.resources
group by entity_id, folder_id, area;

grant select on public.resource_library_counts to authenticated;

create table if not exists public.ai_concepts (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.entities(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  title text not null check (length(trim(title)) between 1 and 240),
  slug text not null,
  content_md text not null default '',
  tags text[] not null default '{}',
  status text not null default 'draft' check (status in ('draft', 'approved', 'archived')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (entity_id, slug)
);

alter table public.resources
  add column if not exists ai_concept_id uuid references public.ai_concepts(id) on delete set null;

create index if not exists resources_ai_concept_idx
on public.resources (ai_concept_id, created_at desc);

create index if not exists ai_concepts_entity_status_updated_idx
on public.ai_concepts (entity_id, status, updated_at desc);

create table if not exists public.ai_concept_revisions (
  id uuid primary key default gen_random_uuid(),
  concept_id uuid not null references public.ai_concepts(id) on delete cascade,
  snapshot jsonb not null,
  actor_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists ai_concept_revisions_concept_created_idx
on public.ai_concept_revisions (concept_id, created_at desc);

create or replace function private.validate_resource_folder_scope()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  project_entity_id uuid;
  parent_entity_id uuid;
  parent_project_id uuid;
  parent_area text;
begin
  if new.project_id is not null then
    select project.entity_id into project_entity_id
    from public.projects project
    where project.id = new.project_id;

    if not found or project_entity_id is distinct from new.entity_id then
      raise exception 'Folder project must belong to its entity';
    end if;
  end if;

  if new.parent_folder_id is not null then
    select folder.entity_id, folder.project_id, folder.area
    into parent_entity_id, parent_project_id, parent_area
    from public.resource_folders folder
    where folder.id = new.parent_folder_id;

    if not found
      or parent_entity_id is distinct from new.entity_id
      or parent_project_id is distinct from new.project_id
      or parent_area is distinct from new.area then
      raise exception 'Parent folder must have the same entity, project and area';
    end if;

    if new.id = new.parent_folder_id or exists (
      with recursive descendants(id) as (
        select folder.id from public.resource_folders folder where folder.parent_folder_id = new.id
        union all
        select folder.id from public.resource_folders folder join descendants on folder.parent_folder_id = descendants.id
      )
      select 1 from descendants where id = new.parent_folder_id
    ) then
      raise exception 'Folder hierarchy cannot contain a cycle';
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create or replace function private.validate_ai_concept_scope()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  project_entity_id uuid;
begin
  if new.project_id is not null then
    select project.entity_id into project_entity_id
    from public.projects project
    where project.id = new.project_id;

    if not found or project_entity_id is distinct from new.entity_id then
      raise exception 'AI concept project must belong to its entity';
    end if;
  end if;
  new.title := trim(new.title);
  new.slug := trim(new.slug);
  return new;
end;
$$;

create or replace function private.seed_gallery_folders_for_entity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.resource_folders (entity_id, area, name, category, sort_order)
  values
    (new.id, 'gallery', 'Iconos', 'icon', 10),
    (new.id, 'gallery', 'Portadas', 'cover', 20),
    (new.id, 'gallery', 'Iconos secundarios', 'secondary_icon', 30),
    (new.id, 'gallery', 'Especiales', 'special', 40),
    (new.id, 'gallery', 'Fotos reales', 'photo', 50),
    (new.id, 'gallery', 'Galería extra', 'gallery_extra', 60)
  on conflict do nothing;
  return new;
end;
$$;

create or replace function private.validate_resource_folder_assignment()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  folder_entity_id uuid;
  folder_project_id uuid;
  folder_area text;
  concept_entity_id uuid;
  concept_project_id uuid;
  resource_project_entity_id uuid;
begin
  if new.ai_concept_id is not null then
    select concept.entity_id, concept.project_id into concept_entity_id, concept_project_id
    from public.ai_concepts concept
    where concept.id = new.ai_concept_id;

    if not found
      or (new.entity_id is not null and new.entity_id is distinct from concept_entity_id)
      or (new.project_id is not null and new.project_id is distinct from concept_project_id) then
      raise exception 'AI concept must belong to the resource entity';
    end if;
    if new.area not in ('ai_concepts', 'documents') then
      raise exception 'AI concept attachments must use the AI Concepts library';
    end if;

    new.entity_id := concept_entity_id;
  new.project_id := concept_project_id;
    new.area := 'ai_concepts';
  end if;

  if new.project_id is not null then
    select project.entity_id into resource_project_entity_id
    from public.projects project
    where project.id = new.project_id;

    if not found or resource_project_entity_id is distinct from new.entity_id then
      raise exception 'Resource project must belong to its entity';
    end if;
  end if;

  if new.folder_id is null then return new; end if;

  select folder.entity_id, folder.project_id, folder.area
  into folder_entity_id, folder_project_id, folder_area
  from public.resource_folders folder
  where folder.id = new.folder_id;

  if not found then raise exception 'Resource folder does not exist'; end if;
  if new.ai_concept_id is not null and folder_area <> 'ai_concepts' then
    raise exception 'AI concept attachments must use an AI Concepts folder';
  end if;
  if new.entity_id is not null and new.entity_id is distinct from folder_entity_id then
    raise exception 'Resource entity must match its folder';
  end if;
  if new.project_id is not null and new.project_id is distinct from folder_project_id then
    raise exception 'Resource project must match its folder';
  end if;
  new.entity_id := folder_entity_id;
  new.project_id := folder_project_id;
  new.area := folder_area;
  new.updated_at := now();
  return new;
end;
$$;

create or replace function private.capture_ai_concept_revision()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.ai_concept_revisions (concept_id, snapshot, actor_id)
  values (old.id, to_jsonb(old), auth.uid());
  return new;
end;
$$;

create or replace function private.sync_ai_concept_resources()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.entity_id is distinct from old.entity_id or new.project_id is distinct from old.project_id then
    update public.resources
    set entity_id = new.entity_id,
        project_id = new.project_id,
        folder_id = null,
        area = 'ai_concepts'
    where ai_concept_id = new.id;
  end if;
  return new;
end;
$$;

revoke all on function private.validate_resource_folder_scope() from public, anon, authenticated;
revoke all on function private.validate_ai_concept_scope() from public, anon, authenticated;
revoke all on function private.seed_gallery_folders_for_entity() from public, anon, authenticated;
revoke all on function private.validate_resource_folder_assignment() from public, anon, authenticated;
revoke all on function private.capture_ai_concept_revision() from public, anon, authenticated;
revoke all on function private.sync_ai_concept_resources() from public, anon, authenticated;

drop trigger if exists resource_folders_validate_scope on public.resource_folders;
create trigger resource_folders_validate_scope
before insert or update on public.resource_folders
for each row execute function private.validate_resource_folder_scope();

drop trigger if exists entities_seed_gallery_folders on public.entities;
create trigger entities_seed_gallery_folders
after insert on public.entities
for each row execute function private.seed_gallery_folders_for_entity();

drop trigger if exists resource_folders_audit_change on public.resource_folders;
create trigger resource_folders_audit_change
after insert or update or delete on public.resource_folders
for each row execute function private.capture_change();

drop trigger if exists resources_validate_folder on public.resources;
create trigger resources_validate_folder
before insert or update of folder_id, entity_id, project_id, area on public.resources
for each row execute function private.validate_resource_folder_assignment();

drop trigger if exists resource_folders_touch_updated_at on public.resource_folders;
create trigger resource_folders_touch_updated_at
before update on public.resource_folders
for each row execute function private.touch_updated_at();

drop trigger if exists resources_touch_updated_at on public.resources;
create trigger resources_touch_updated_at
before update on public.resources
for each row execute function private.touch_updated_at();

drop trigger if exists ai_concepts_touch_updated_at on public.ai_concepts;
create trigger ai_concepts_touch_updated_at
before update on public.ai_concepts
for each row execute function private.touch_updated_at();

drop trigger if exists ai_concepts_validate_scope on public.ai_concepts;
create trigger ai_concepts_validate_scope
before insert or update on public.ai_concepts
for each row execute function private.validate_ai_concept_scope();

drop trigger if exists ai_concepts_audit_change on public.ai_concepts;
create trigger ai_concepts_audit_change
after insert or update or delete on public.ai_concepts
for each row execute function private.capture_change();

drop trigger if exists ai_concepts_capture_revision on public.ai_concepts;
create trigger ai_concepts_capture_revision
after update on public.ai_concepts
for each row execute function private.capture_ai_concept_revision();

drop trigger if exists ai_concepts_sync_resources on public.ai_concepts;
create trigger ai_concepts_sync_resources
after update of entity_id, project_id on public.ai_concepts
for each row execute function private.sync_ai_concept_resources();

alter table public.resource_folders enable row level security;
alter table public.ai_concepts enable row level security;
alter table public.ai_concept_revisions enable row level security;

drop policy if exists founder_rw on public.resource_folders;
create policy founder_rw on public.resource_folders for all to authenticated
using ((select private.is_founder())) with check ((select private.is_founder()));
drop policy if exists require_aal2 on public.resource_folders;
create policy require_aal2 on public.resource_folders as restrictive for all to authenticated
using ((select auth.jwt() ->> 'aal') = 'aal2') with check ((select auth.jwt() ->> 'aal') = 'aal2');

drop policy if exists founder_rw on public.ai_concepts;
create policy founder_rw on public.ai_concepts for all to authenticated
using ((select private.is_founder())) with check ((select private.is_founder()));
drop policy if exists require_aal2 on public.ai_concepts;
create policy require_aal2 on public.ai_concepts as restrictive for all to authenticated
using ((select auth.jwt() ->> 'aal') = 'aal2') with check ((select auth.jwt() ->> 'aal') = 'aal2');

drop policy if exists founder_read_revisions on public.ai_concept_revisions;
create policy founder_read_revisions on public.ai_concept_revisions for select to authenticated
using ((select private.is_founder()));
drop policy if exists revisions_require_aal2 on public.ai_concept_revisions;
create policy revisions_require_aal2 on public.ai_concept_revisions as restrictive for select to authenticated
using ((select auth.jwt() ->> 'aal') = 'aal2');

grant select, insert, update, delete on public.resource_folders, public.ai_concepts to authenticated;
grant select on public.ai_concept_revisions to authenticated;

insert into public.resource_folders (entity_id, area, name, category, sort_order)
select entity.id, 'gallery', folder.name, folder.category, folder.sort_order
from public.entities entity
cross join (values
  ('Iconos', 'icon', 10),
  ('Portadas', 'cover', 20),
  ('Iconos secundarios', 'secondary_icon', 30),
  ('Especiales', 'special', 40),
  ('Fotos reales', 'photo', 50),
  ('Galería extra', 'gallery_extra', 60)
) as folder(name, category, sort_order)
on conflict do nothing;