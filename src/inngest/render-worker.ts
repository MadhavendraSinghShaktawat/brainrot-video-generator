import { inngest } from '@/lib/inngest';
import { createClient } from '@supabase/supabase-js';
import { GoogleCloudStorageService } from '@/lib/google-cloud-storage';
import { Database, RenderJob } from '@/types/database';

interface RunPodJobResponse {
  id: string;
  status: 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  output?: {
    video_url?: string;
    error?: string;
  };
}

// Create service client (bypasses RLS for background processing)
function createServiceClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Inngest function for render job processing
export const renderJobWorker = inngest.createFunction(
  { 
    id: 'render-job-worker',
    name: 'Render Job Worker',
    retries: 3,
  },
  { event: 'render.job.process' },
  async ({ event, step }) => {
    const { jobId } = event.data;
    
    const supabase = createServiceClient();
    
    // Step 1: Get the job from database
    const job = await step.run('get-job', async () => {
      console.log(`🔍 Fetching render job: ${jobId}`);
      
      const { data: jobData, error } = await supabase
        .from('render_jobs')
        .select('*')
        .eq('id', jobId)
        .single();
        
      if (error || !jobData) {
        throw new Error(`Job not found: ${jobId}`);
      }
      
      if (jobData.status !== 'pending') {
        throw new Error(`Job ${jobId} is not pending (current status: ${jobData.status})`);
      }
      
      return jobData;
    });
    
    // Step 2: Update job status to processing
    await step.run('update-status-processing', async () => {
      console.log(`🔄 Updating job ${jobId} status to processing`);
      
      const { error } = await supabase
        .from('render_jobs')
        .update({ status: 'processing' })
        .eq('id', jobId);
        
      if (error) {
        throw new Error(`Failed to update job status: ${error.message}`);
      }
    });
    
    // Step 3: Upload timeline JSON to GCS
    const timelineUrl = await step.run('upload-timeline', async () => {
      console.log(`📤 Uploading timeline JSON for job ${jobId}`);
      
      const timelineJson = JSON.stringify(job.timeline_json);
      const fileName = `timeline-${jobId}.json`;
      
      const { publicUrl } = await GoogleCloudStorageService.uploadTimeline(
        Buffer.from(timelineJson, 'utf8'),
        fileName
      );
      
      console.log(`✅ Timeline uploaded: ${publicUrl}`);
      return publicUrl;
    });
    
    // Step 4: Submit job to RunPod
    const runpodJobId = await step.run('submit-to-runpod', async () => {
      console.log(`🚀 Submitting job ${jobId} to RunPod`);
      
      const runpodEndpoint = process.env.RUNPOD_ENDPOINT;
      const runpodApiKey = process.env.RUNPOD_API_KEY;
      
      if (!runpodEndpoint || !runpodApiKey) {
        throw new Error('RunPod endpoint or API key not configured');
      }
      
      const response = await fetch(runpodEndpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${runpodApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          input: {
            timeline_url: timelineUrl,
            output_filename: `video-${jobId}.mp4`,
            composition_id: 'JsonDrivenVideo'
          }
        })
      });
      
      if (!response.ok) {
        throw new Error(`RunPod submission failed: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log(`✅ RunPod job submitted: ${result.id}`);
      return result.id;
    });
    
    // Step 5: Poll RunPod for completion
    const videoUrl = await step.run('poll-runpod', async () => {
      console.log(`⏳ Polling RunPod job ${runpodJobId} for completion`);
      
      const runpodEndpoint = process.env.RUNPOD_ENDPOINT;
      const runpodApiKey = process.env.RUNPOD_API_KEY;
      const statusEndpoint = runpodEndpoint!.replace(/\/run$/, '/status');
      
      const maxPolls = 60; // 10 minutes max (10 seconds * 60)
      const pollInterval = 10000; // 10 seconds
      
      for (let attempt = 1; attempt <= maxPolls; attempt++) {
        // Wait between polls
        if (attempt > 1) {
          await new Promise(resolve => setTimeout(resolve, pollInterval));
        }
        
        try {
          const statusResponse = await fetch(`${statusEndpoint}/${runpodJobId}`, {
            headers: {
              'Authorization': `Bearer ${runpodApiKey}`
            }
          });
          
          if (!statusResponse.ok) {
            console.warn(`⚠️ Status check failed (attempt ${attempt}): ${statusResponse.status}`);
            continue;
          }
          
          const statusData: RunPodJobResponse = await statusResponse.json();
          console.log(`📊 RunPod status (attempt ${attempt}): ${statusData.status}`);
          
          if (statusData.status === 'COMPLETED') {
            if (statusData.output?.video_url) {
              console.log(`✅ RunPod job completed: ${statusData.output.video_url}`);
              return statusData.output.video_url;
            } else {
              throw new Error('RunPod job completed but no video URL returned');
            }
          }
          
          if (statusData.status === 'FAILED' || statusData.status === 'CANCELLED') {
            const errorMsg = statusData.output?.error || `Job ${statusData.status.toLowerCase()}`;
            throw new Error(`RunPod job failed: ${errorMsg}`);
          }
          
          // Continue polling for IN_QUEUE, IN_PROGRESS
          
        } catch (error) {
          console.warn(`⚠️ Polling error (attempt ${attempt}):`, error);
          if (attempt === maxPolls) {
            throw error;
          }
        }
      }
      
      throw new Error(`RunPod job ${runpodJobId} timed out after ${maxPolls} attempts`);
    });
    
    // Step 6: Update job status to completed
    await step.run('update-status-completed', async () => {
      console.log(`✅ Updating job ${jobId} status to completed`);
      
      const { error } = await supabase
        .from('render_jobs')
        .update({ 
          status: 'completed',
          result_url: videoUrl
        })
        .eq('id', jobId);
        
      if (error) {
        throw new Error(`Failed to update job status: ${error.message}`);
      }
    });
    
    console.log(`🎉 Render job ${jobId} completed successfully!`);
    return {
      success: true,
      jobId,
      videoUrl
    };
  }
);

// Inngest function for polling pending jobs
export const renderJobPoller = inngest.createFunction(
  {
    id: 'render-job-poller',
    name: 'Render Job Poller',
  },
  { cron: '*/1 * * * *' }, // Every 1 minute
  async ({ step }) => {
    const supabase = createServiceClient();
    
    // Get all pending jobs
    const pendingJobs = await step.run('get-pending-jobs', async () => {
      console.log('🔍 Checking for pending render jobs...');
      
      const { data: jobs, error } = await supabase
        .from('render_jobs')
        .select('id, created_at')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(5); // Process max 5 jobs at once
        
      if (error) {
        console.error('Error fetching pending jobs:', error);
        return [];
      }
      
      return jobs || [];
    });
    
    if (pendingJobs.length === 0) {
      console.log('✅ No pending jobs found');
      return { processedJobs: 0 };
    }
    
    // Process each pending job
    const processedJobs = await step.run('process-pending-jobs', async () => {
      console.log(`🚀 Processing ${pendingJobs.length} pending jobs`);
      
      const processPromises = pendingJobs.map(async (job) => {
        try {
          await inngest.send({
            name: 'render.job.process',
            data: { jobId: job.id }
          });
          console.log(`✅ Queued job ${job.id} for processing`);
          return job.id;
        } catch (error) {
          console.error(`❌ Failed to queue job ${job.id}:`, error);
          return null;
        }
      });
      
      const results = await Promise.all(processPromises);
      return results.filter(id => id !== null);
    });
    
    console.log(`📊 Queued ${processedJobs.length} jobs for processing`);
    return { processedJobs: processedJobs.length };
  }
);

// Inngest function for handling failed jobs
export const renderJobFailureHandler = inngest.createFunction(
  { 
    id: 'render-job-failure-handler',
    name: 'Render Job Failure Handler',
  },
  { event: 'render.job.process.failure' },
  async ({ event, step }) => {
    const { jobId, error } = event.data;
    
    const supabase = createServiceClient();
    
    await step.run('update-status-failed', async () => {
      console.log(`❌ Updating job ${jobId} status to failed`);
      
      const { error: updateError } = await supabase
        .from('render_jobs')
        .update({ 
          status: 'failed',
          error_message: error
        })
        .eq('id', jobId);
        
      if (updateError) {
        console.error(`Failed to update job ${jobId} status:`, updateError);
      }
    });
    
    return { success: true };
  }
); 