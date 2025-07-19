import { useQuery } from '@tanstack/react-query';
import { AvatarTemplate } from '@/types/avatar';

export function useAvatarTemplates() {
  return useQuery<{ avatars: AvatarTemplate[] }, Error>({
    queryKey: ['avatar-templates'],
    queryFn: async () => {
      const res = await fetch('/api/avatar/templates');
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to load avatars');
      }
      return data as { avatars: AvatarTemplate[] };
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  });
} 