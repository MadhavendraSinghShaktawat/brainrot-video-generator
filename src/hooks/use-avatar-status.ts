import { useQuery } from '@tanstack/react-query';

interface StatusResponse {
  status: 'queued' | 'processing' | 'completed' | 'failed';
  outputUrl?: string | null;
  error?: string | null;
}

export function useAvatarStatus(jobId: string | undefined | null) {
  return useQuery<StatusResponse, Error>({
    queryKey: ['avatar-status', jobId],
    queryFn: async () => {
      const res = await fetch(`/api/avatar/status?id=${jobId}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Status fetch failed');
      }
      return data as StatusResponse;
    },
    enabled: !!jobId,
    refetchInterval: (query) =>
      query.state.data?.status === 'completed' ? false : 5000,
  });
} 