-- Keep private rooms short-lived while permitting independent Clerk users to
-- host one active room each. The index serializes concurrent creation for a
-- single owner across Vercel instances.
drop index if exists public.dp_rooms_one_open_room_idx;

create unique index if not exists dp_rooms_one_open_room_per_owner_idx
  on public.dp_rooms (owner_clerk_user_id)
  where status in ('lobby', 'active', 'paused');
