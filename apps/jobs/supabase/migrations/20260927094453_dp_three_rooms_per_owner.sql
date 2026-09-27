-- Each signed-in creator may host up to three unexpired rooms. Serialize
-- concurrent inserts for the same creator across Vercel instances.
create or replace function private.dp_enforce_owner_room_limit()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.status not in ('lobby', 'active', 'paused') or new.expires_at <= now() then
    return new;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('dp-room-limit:' || new.owner_clerk_user_id, 0)
  );

  if (
    select count(*)
    from public.dp_rooms as existing
    where existing.owner_clerk_user_id = new.owner_clerk_user_id
      and existing.id <> new.id
      and existing.status in ('lobby', 'active', 'paused')
      and existing.expires_at > now()
  ) >= 3 then
    raise exception using errcode = '23514', message = 'dp_room_limit_reached';
  end if;
  return new;
end;
$$;

revoke all on function private.dp_enforce_owner_room_limit() from public, anon, authenticated;

drop index if exists public.dp_rooms_one_open_room_per_owner_idx;

create index if not exists dp_rooms_open_owner_idx
  on public.dp_rooms (owner_clerk_user_id, created_at desc)
  where status in ('lobby', 'active', 'paused');

create trigger dp_owner_room_limit
  before insert or update of status, owner_clerk_user_id, expires_at
  on public.dp_rooms
  for each row execute function private.dp_enforce_owner_room_limit();
