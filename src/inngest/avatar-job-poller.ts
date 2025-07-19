import { inngest } from '@/lib/inngest';
import { supabaseAdmin } from '@/lib/db';
import { getAvatarProvider } from '@/services/avatar-providers';
import { AvatarJobStatus } from '@/types/avatar';
// remote URLs recorded directly; no download

export const pollAvatarJobs = inngest.createFunction(
  { id: 'avatar-job-poller', name: 'Poll In-Progress Avatar Jobs' },
  { cron: '*/5 * * * *' },
  async () => {
    const { data: jobs, error } = await supabaseAdmin
      .from('avatar_jobs')
      .select('*')
      .in('status', ['processing', 'queued']);

    if (error) {
      console.error('Avatar poller fetch error', error);
      return { error: error.message };
    }

    if (!jobs || jobs.length === 0) return { processed: 0 };

    const provider = getAvatarProvider();
    let updated = 0;

    for (const job of jobs) {
      try {
        const res = await provider.fetchStatus(job.provider_job_id);
        if (res.status !== job.status || res.outputUrl !== job.output_url) {
          await supabaseAdmin
            .from('avatar_jobs')
            .update({ status: res.status as AvatarJobStatus, output_url: res.outputUrl ?? null, error_message: res.errorMessage ?? null, updated_at: new Date().toISOString() })
            .eq('id', job.id);
        }

        // Record completed videos in assets table (remote URL)
        if (res.status === 'completed' && res.outputUrl && job.status !== 'completed') {
          await supabaseAdmin
            .from('assets')
            .upsert({ id: job.id, url: res.outputUrl, description: 'HeyGen speaking avatar video' }, { onConflict: 'id', ignoreDuplicates: true });
        }
      } catch (err) {
        console.error('Avatar poller task error', err);
      }
    }

    return { processed: updated };
  }
); 