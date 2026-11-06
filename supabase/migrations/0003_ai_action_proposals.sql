create table if not exists private.ai_action_proposals (
  id uuid primary key,
  actor_id uuid not null references auth.users(id) on delete cascade,
  action jsonb not null,
  expected_record jsonb,
  expires_at timestamptz not null default now() + interval '10 minutes',
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table private.ai_action_proposals enable row level security;
revoke all on private.ai_action_proposals from public, anon, authenticated;

create or replace function public.create_ai_action_proposal(
  p_id uuid,
  p_action jsonb,
  p_expected_record jsonb default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (select private.is_founder()) or jsonb_typeof(p_action) <> 'object' then
    raise exception 'Not authorized to create an AI action proposal';
  end if;

  delete from private.ai_action_proposals
  where actor_id = auth.uid()
    and (expires_at < now() - interval '1 day' or consumed_at < now() - interval '1 day');

  insert into private.ai_action_proposals (id, actor_id, action, expected_record)
  values (p_id, auth.uid(), p_action, p_expected_record);
end;
$$;

create or replace function public.consume_ai_action_proposal(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  proposal jsonb;
begin
  if not (select private.is_founder()) then
    raise exception 'Not authorized to consume an AI action proposal';
  end if;

  update private.ai_action_proposals
  set consumed_at = now()
  where id = p_id
    and actor_id = auth.uid()
    and consumed_at is null
    and expires_at > now()
  returning jsonb_build_object('action', action, 'expected_record', expected_record)
  into proposal;

  if proposal is null then
    raise exception 'AI action proposal is missing, expired, or already consumed';
  end if;

  return proposal;
end;
$$;

create or replace function public.cancel_ai_action_proposal(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (select private.is_founder()) then
    raise exception 'Not authorized to cancel an AI action proposal';
  end if;

  update private.ai_action_proposals
  set consumed_at = now()
  where id = p_id
    and actor_id = auth.uid()
    and consumed_at is null;
end;
$$;

revoke all on function public.create_ai_action_proposal(uuid, jsonb, jsonb) from public, anon;
revoke all on function public.consume_ai_action_proposal(uuid) from public, anon;
revoke all on function public.cancel_ai_action_proposal(uuid) from public, anon;
grant execute on function public.create_ai_action_proposal(uuid, jsonb, jsonb) to authenticated;
grant execute on function public.consume_ai_action_proposal(uuid) to authenticated;
grant execute on function public.cancel_ai_action_proposal(uuid) to authenticated;