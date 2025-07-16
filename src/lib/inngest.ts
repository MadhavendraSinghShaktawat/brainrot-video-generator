import { Inngest, EventSchemas } from 'inngest';

// Define our event types for video generation and render jobs
type Events = {
  'video.generation.requested': {
    data: {
      scriptId: string;
      audioUrl: string;
      backgroundVideo: string;
      scriptContent: string;
      userId: string;
    };
  };
  'video.generation.progress': {
    data: {
      scriptId: string;
      step: string;
      progress: number;
      message?: string;
    };
  };
  'video.generation.completed': {
    data: {
      scriptId: string;
      videoUrl: string;
      duration: string;
    };
  };
  'video.generation.failed': {
    data: {
      scriptId: string;
      error: string;
      step?: string;
    };
  };
  'render.job.process': {
    data: {
      jobId: string;
    };
  };
  'render.job.process.failure': {
    data: {
      jobId: string;
      error: string;
    };
  };
};

// Create Inngest client with proper typing
export const inngest = new Inngest({
  id: 'brainrot-video-generator',
  schemas: new EventSchemas().fromRecord<Events>(),
});

export type VideoGenerationEvents = Events; 