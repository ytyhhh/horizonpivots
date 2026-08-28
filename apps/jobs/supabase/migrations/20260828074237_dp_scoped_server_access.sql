-- DP uses a dedicated server-only application key in addition to the normal
-- Supabase publishable key. This keeps the application scoped to the dp_ tables
-- instead of giving it the project-wide service_role credential.

create table if not exists private.dp_server_credentials (
  singleton boolean primary key default true check (singleton),
  key_hash text not null check (key_hash ~ '^[0-9a-f]{64}$'),
  updated_at timestamptz not null default now()
);

alter table private.dp_server_credentials enable row level security;
alter table private.dp_server_credentials force row level security;

revoke all on table private.dp_server_credentials from public, anon, authenticated, service_role;

create or replace function private.dp_server_request_authorized()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from private.dp_server_credentials as credential
    where credential.singleton
      and credential.key_hash = pg_catalog.encode(
        extensions.digest(
          coalesce(
            coalesce(
              nullif(current_setting('request.headers', true), ''),
              '{}'
            )::jsonb ->> 'x-dp-server-key',
            ''
          ),
          'sha256'::text
        ),
        'hex'::text
      )
  );
$$;

revoke all on function private.dp_server_request_authorized()
  from public, anon, authenticated, service_role;
grant execute on function private.dp_server_request_authorized()
  to anon;

-- The private schema remains outside the Data API exposed schemas. USAGE is
-- needed only so RLS and the existing SECURITY INVOKER RPCs can resolve objects.
grant usage on schema private to anon;

grant select, update on table
  public.dp_rooms,
  public.dp_participants,
  public.dp_public_state
to anon;

grant select on table public.dp_action_log to anon;
grant select, insert on table public.dp_chat_messages to anon;

grant select, insert, update on table
  private.dp_game_state,
  private.dp_guest_sessions
to anon;

grant select, insert, update, delete on table private.dp_join_limits to anon;

grant execute on function private.dp_public_payload_is_safe(jsonb)
  to anon;
grant execute on function private.dp_touch_updated_at()
  to anon;
grant execute on function private.dp_record_join_failure(text, integer, interval, interval)
  to anon;

grant execute on function public.dp_create_room(
  uuid, uuid, text, text, uuid, text, text, smallint, bigint, bigint, bigint, smallint, jsonb, jsonb
) to anon;
grant execute on function public.dp_join_room(text, text, text, text, text)
  to anon;
grant execute on function public.dp_get_game_state(uuid)
  to anon;
grant execute on function public.dp_resolve_guest_session(uuid, text)
  to anon;
grant execute on function public.dp_revoke_guest_session(uuid, uuid)
  to anon;
grant execute on function public.dp_register_join_failure(text, integer, interval, interval)
  to anon;
grant execute on function public.dp_clear_join_limit(text)
  to anon;
grant execute on function public.dp_commit_state(
  uuid, uuid, bigint, uuid, text, jsonb, jsonb, jsonb
) to anon;

drop policy if exists dp_server_access on public.dp_rooms;
create policy dp_server_access on public.dp_rooms
  for all to anon
  using ((select private.dp_server_request_authorized()))
  with check ((select private.dp_server_request_authorized()));

drop policy if exists dp_server_access on public.dp_participants;
create policy dp_server_access on public.dp_participants
  for all to anon
  using ((select private.dp_server_request_authorized()))
  with check ((select private.dp_server_request_authorized()));

drop policy if exists dp_server_access on public.dp_public_state;
create policy dp_server_access on public.dp_public_state
  for all to anon
  using ((select private.dp_server_request_authorized()))
  with check ((select private.dp_server_request_authorized()));

drop policy if exists dp_server_access on public.dp_action_log;
create policy dp_server_access on public.dp_action_log
  for all to anon
  using ((select private.dp_server_request_authorized()))
  with check ((select private.dp_server_request_authorized()));

drop policy if exists dp_server_access on public.dp_chat_messages;
create policy dp_server_access on public.dp_chat_messages
  for all to anon
  using ((select private.dp_server_request_authorized()))
  with check ((select private.dp_server_request_authorized()));

drop policy if exists dp_server_access on private.dp_game_state;
create policy dp_server_access on private.dp_game_state
  for all to anon
  using ((select private.dp_server_request_authorized()))
  with check ((select private.dp_server_request_authorized()));

drop policy if exists dp_server_access on private.dp_guest_sessions;
create policy dp_server_access on private.dp_guest_sessions
  for all to anon
  using ((select private.dp_server_request_authorized()))
  with check ((select private.dp_server_request_authorized()));

drop policy if exists dp_server_access on private.dp_join_limits;
create policy dp_server_access on private.dp_join_limits
  for all to anon
  using ((select private.dp_server_request_authorized()))
  with check ((select private.dp_server_request_authorized()));

-- The cleanup job runs with an empty search_path, so pgcrypto must be qualified.
create or replace function public.dp_cleanup_expired_data()
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  update public.dp_rooms
  set
    status = 'expired',
    closed_at = coalesce(closed_at, now()),
    locked = true
  where status in ('lobby', 'active', 'paused')
    and expires_at <= now();

  update private.dp_guest_sessions as guest_session
  set revoked_at = coalesce(guest_session.revoked_at, now())
  where guest_session.revoked_at is null
    and (
      guest_session.expires_at <= now()
      or exists (
        select 1
        from public.dp_rooms as room
        where room.id = guest_session.room_id
          and room.status in ('closed', 'expired')
      )
    );

  delete from public.dp_chat_messages as message
  using public.dp_rooms as room
  where message.room_id = room.id
    and room.status in ('closed', 'expired')
    and coalesce(room.closed_at, room.expires_at) <= now() - interval '24 hours';

  delete from public.dp_public_state as public_state
  using public.dp_rooms as room
  where public_state.room_id = room.id
    and room.status in ('closed', 'expired')
    and coalesce(room.closed_at, room.expires_at) <= now() - interval '24 hours';

  delete from private.dp_game_state as game_state
  using public.dp_rooms as room
  where game_state.room_id = room.id
    and room.status in ('closed', 'expired')
    and coalesce(room.closed_at, room.expires_at) <= now() - interval '24 hours';

  delete from private.dp_guest_sessions as guest_session
  using public.dp_rooms as room
  where guest_session.room_id = room.id
    and room.status in ('closed', 'expired')
    and coalesce(room.closed_at, room.expires_at) <= now() - interval '24 hours';

  update public.dp_action_log as action_log
  set metadata = '{}'::jsonb
  from public.dp_rooms as room
  where action_log.room_id = room.id
    and room.status in ('closed', 'expired')
    and coalesce(room.closed_at, room.expires_at) <= now() - interval '24 hours'
    and action_log.metadata <> '{}'::jsonb;

  update public.dp_rooms as room
  set
    owner_clerk_user_id = 'purged',
    code_hash = pg_catalog.encode(
      extensions.digest('purged:' || room.id::text, 'sha256'::text),
      'hex'::text
    )
  where room.status in ('closed', 'expired')
    and coalesce(room.closed_at, room.expires_at) <= now() - interval '24 hours'
    and room.owner_clerk_user_id <> 'purged';

  delete from public.dp_participants as participant
  using public.dp_rooms as room
  where participant.room_id = room.id
    and room.status in ('closed', 'expired')
    and coalesce(room.closed_at, room.expires_at) <= now() - interval '24 hours';

  delete from private.dp_join_limits
  where updated_at <= now() - interval '24 hours'
    and (blocked_until is null or blocked_until <= now());

  delete from public.dp_rooms
  where status in ('closed', 'expired')
    and coalesce(closed_at, expires_at) <= now() - interval '30 days';
end;
$$;
