import { useQuery } from '@tanstack/react-query';
import { VoiceTemplate } from '@/types/avatar';

export function useVoices() {
  return useQuery<{ voices: VoiceTemplate[] }, Error>({
    queryKey: ['avatar-voices'],
    queryFn: async () => {
      const res = await fetch('/api/avatar/voices');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load voices');
      return data as { voices: VoiceTemplate[] };
    },
    staleTime: 1000 * 60 * 60,
  });
} 