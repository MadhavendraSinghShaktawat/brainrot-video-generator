import { createClient } from '@supabase/supabase-js';

/**
 * Singleton typed Supabase client for server-side usage.
 *
 * Reads URL and service role key from environment variables:
 *  - NEXT_PUBLIC_SUPABASE_URL
 *  - SUPABASE_SERVICE_ROLE_KEY
 *
 * The service role key is required for RLS overrides during background jobs.
 * For user-scoped requests, use the existing auth helpers instead.
 */
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

/**
 * Convenience helper to insert or update a timeline row.
 */
export async function upsertTimeline({
  id,
  user_id,
  title,
  data,
}: {
  id?: string;
  user_id: string;
  title: string;
  data: unknown;
}) {
  return supabaseAdmin
    .from('timelines')
    .upsert({ id, user_id, title, data })
    .select()
    .single();
}

/**
 * Fetch a timeline by ID after RLS.
 */
export async function fetchTimeline(timelineId: string) {
  return supabaseAdmin.from('timelines').select('*').eq('id', timelineId).single();
} 