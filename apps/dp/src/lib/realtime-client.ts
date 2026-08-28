"use client";

import { createClient, type RealtimeChannel, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null | undefined;

function getRealtimeClient() {
  if (client !== undefined) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  client = url && key
    ? createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
        realtime: { params: { eventsPerSecond: 5 } },
      })
    : null;
  return client;
}

export function subscribeToRoom(topic: string, onStateHint: () => void): () => void {
  const realtime = getRealtimeClient();
  if (!realtime || !topic) return () => undefined;

  let channel: RealtimeChannel | null = realtime.channel(topic, { config: { broadcast: { self: false } } });
  channel
    .on("broadcast", { event: "state" }, onStateHint)
    .on("broadcast", { event: "room" }, onStateHint)
    .subscribe();

  return () => {
    if (channel) void realtime.removeChannel(channel);
    channel = null;
  };
}
