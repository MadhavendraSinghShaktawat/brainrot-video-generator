import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

type Asset = {
  id: string;
  name?: string;
  url: string | null;
  previewUrl: string | null;
  description?: string | null;
  type: string;
};

export function useAssets(type: 'video' | 'photo' | 'audio') {
  const queryClient = useQueryClient();

  const query = useQuery<Asset[], Error>({
    queryKey: ['assets', type],
    queryFn: async () => {
      const res = await fetch(`/api/assets?type=${type}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load assets');
      return data as Asset[];
    },
    staleTime: 1000 * 60 * 5,
  });

  // Realtime subscription
  React.useEffect(() => {
    const assetsChannel = supabase.channel('public:assets');
    const jobsChannel = supabase.channel('public:avatar_jobs');

    assetsChannel
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'assets' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['assets', type] });
        }
      )
      .subscribe();

    jobsChannel
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'avatar_jobs' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['assets', type] });
        }
      )
      .subscribe();

    return () => {
      assetsChannel.unsubscribe();
      jobsChannel.unsubscribe();
    };
  }, [type, queryClient]);

  return query;
} 