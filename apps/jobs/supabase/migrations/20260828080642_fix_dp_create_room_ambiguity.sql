create or replace function public.dp_create_room(
  p_room_id uuid,
  p_public_id uuid,
  p_code_hash text,
  p_broadcast_topic text,
  p_owner_participant_id uuid,
  p_owner_clerk_user_id text,
  p_owner_display_name text,
  p_max_seats smallint,
  p_starting_stack bigint,
  p_small_blind bigint,
  p_big_blind bigint,
  p_action_timeout_seconds smallint,
  p_initial_private_state jsonb,
  p_initial_public_state jsonb
)
returns table (
  room_id uuid,
  public_id uuid,
  broadcast_topic text,
  owner_participant_id uuid,
  version bigint,
  expires_at timestamptz
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_room_id uuid;
  v_owner_participant_id uuid;
  v_public_id uuid;
  v_broadcast_topic text;
  v_expires_at timestamptz;
begin
  if p_room_id is null or p_public_id is null or p_owner_participant_id is null then
    raise exception using errcode = '22023', message = 'invalid_identifier';
  end if;
  if p_code_hash !~ '^[0-9a-f]{64}$' then
    raise exception using errcode = '22023', message = 'invalid_code_hash';
  end if;
  if p_broadcast_topic !~ '^[0-9A-Za-z_-]{32,96}$' then
    raise exception using errcode = '22023', message = 'invalid_broadcast_topic';
  end if;
  if jsonb_typeof(p_initial_private_state) is distinct from 'object'
    or p_initial_private_state ->> 'version' is distinct from '0'
    or p_initial_private_state ->> 'tableId' is distinct from p_room_id::text
    or p_initial_private_state #>> '{config,maxSeats}' is distinct from p_max_seats::text
    or p_initial_private_state #>> '{config,startingStack}' is distinct from p_starting_stack::text
    or p_initial_private_state #>> '{config,smallBlind}' is distinct from p_small_blind::text
    or p_initial_private_state #>> '{config,bigBlind}' is distinct from p_big_blind::text
    or p_initial_private_state #>> '{config,actionTimeoutMs}'
      is distinct from (p_action_timeout_seconds::bigint * 1000)::text
    or jsonb_typeof(p_initial_private_state -> 'players') is distinct from 'array' then
    raise exception using errcode = '22023', message = 'invalid_initial_private_state';
  end if;
  if not exists (
    select 1
    from jsonb_array_elements(p_initial_private_state -> 'players') as player(value)
    where player.value ->> 'id' = p_owner_participant_id::text
  ) then
    raise exception using errcode = '22023', message = 'initial_owner_missing';
  end if;
  if not private.dp_public_payload_is_safe(p_initial_public_state)
    or (
      p_initial_public_state ? 'version'
      and p_initial_public_state ->> 'version' is distinct from '0'
    ) then
    raise exception using errcode = '22023', message = 'invalid_initial_public_state';
  end if;

  update public.dp_rooms as stale_room
  set
    status = 'expired',
    locked = true,
    closed_at = coalesce(stale_room.closed_at, now())
  where stale_room.status in ('lobby', 'active', 'paused')
    and stale_room.expires_at <= now();

  insert into public.dp_rooms as created_room (
    id,
    public_id,
    code_hash,
    broadcast_topic,
    owner_clerk_user_id,
    max_seats,
    starting_stack,
    small_blind,
    big_blind,
    action_timeout_seconds,
    expires_at
  )
  values (
    p_room_id,
    p_public_id,
    p_code_hash,
    p_broadcast_topic,
    p_owner_clerk_user_id,
    p_max_seats,
    p_starting_stack,
    p_small_blind,
    p_big_blind,
    p_action_timeout_seconds,
    now() + interval '12 hours'
  )
  returning created_room.id, created_room.public_id, created_room.broadcast_topic,
    created_room.expires_at
  into v_room_id, v_public_id, v_broadcast_topic, v_expires_at;

  insert into public.dp_participants (
    id,
    room_id,
    kind,
    clerk_user_id,
    display_name,
    role,
    seat,
    stack,
    connected,
    ready,
    sitting_out,
    status
  )
  values (
    p_owner_participant_id,
    v_room_id,
    'owner',
    p_owner_clerk_user_id,
    p_owner_display_name,
    'player',
    1,
    p_starting_stack,
    true,
    true,
    false,
    'ready'
  )
  returning id into v_owner_participant_id;

  insert into private.dp_game_state (room_id, version, state)
  values (v_room_id, 0, p_initial_private_state);

  insert into public.dp_public_state (room_id, version, kind, state)
  values (v_room_id, 0, 'room_created', p_initial_public_state);

  return query
  select
    v_room_id,
    v_public_id,
    v_broadcast_topic,
    v_owner_participant_id,
    0::bigint,
    v_expires_at;
end;
$$;

revoke all on function public.dp_create_room(
  uuid, uuid, text, text, uuid, text, text, smallint, bigint, bigint, bigint, smallint, jsonb, jsonb
) from public, anon, authenticated;

grant execute on function public.dp_create_room(
  uuid, uuid, text, text, uuid, text, text, smallint, bigint, bigint, bigint, smallint, jsonb, jsonb
) to anon, service_role;

-- The DP server uses the anon PostgREST role plus the server-only
-- X-DP-Server-Key. RLS rejects every request without that key. Grant the
-- complete DML set required by the SECURITY INVOKER room/game RPCs so a hand
-- cannot fail later when it first writes an action log or removes stale data.
grant select, insert, update, delete on table
  public.dp_rooms,
  public.dp_participants,
  public.dp_public_state,
  public.dp_action_log,
  public.dp_chat_messages,
  private.dp_game_state,
  private.dp_guest_sessions,
  private.dp_join_limits
to anon;
