import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AvatarRequest } from '@/types/avatar';

interface RenderResponse {
  id: string;
}

export function useAvatarRender() {
  const queryClient = useQueryClient();

  return useMutation<RenderResponse, Error, AvatarRequest>({
    mutationFn: async (payload: AvatarRequest) => {
      const res = await fetch('/api/avatar/render', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Avatar render failed');
      }
      return data as RenderResponse;
    },
    onSuccess: (data, variables) => {
      // optimistic asset card
      const current = queryClient.getQueryData<any>(['assets', 'video']) ?? [];
      queryClient.setQueryData(['assets', 'video'], [
        {
          id: data.id,
          url: null,
          previewUrl: null,
          description: 'Generating avatar video…',
          type: 'video',
        },
        ...current,
      ]);
    },
  });
} 