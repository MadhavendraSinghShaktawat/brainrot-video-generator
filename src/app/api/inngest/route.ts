import { serve } from 'inngest/next';
import { inngest } from '@/lib/inngest';
import { generateVideoWorkflow } from '@/inngest/video-generation';
import { redditStoryAutomation } from '@/inngest/reddit-story-automation';
import { renderJobWorker, renderJobPoller, renderJobFailureHandler } from '@/inngest/render-worker';

// Create the handler and export it as the HTTP methods
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    generateVideoWorkflow,
    redditStoryAutomation,
    renderJobWorker,
    renderJobPoller,
    renderJobFailureHandler,
  ],
  servePath: '/api/inngest',
}); 