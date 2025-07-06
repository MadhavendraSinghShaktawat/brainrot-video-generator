import { serve } from 'inngest/next';
import { inngest } from '@/lib/inngest';
import { generateVideoWorkflow } from '@/inngest/video-generation';

// Create the handler and export it as the HTTP methods
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    generateVideoWorkflow,
  ],
  servePath: '/api/inngest',
}); 