export type AvatarJobStatus = 'queued' | 'processing' | 'completed' | 'failed';

/**
 * Request payload for creating a new AI-avatar render job.
 */
export interface AvatarRequest {
  /** Plain text or SSML script to be spoken by the avatar */
  script: string;
  /** Identifier of the avatar template to use */
  avatarId: string;
  /** Optional voice identifier (provider-specific) */
  voiceId?: string;
  /** Desired video width in pixels (e.g. 1920) */
  width?: number;
  /** Desired video height in pixels (e.g. 1080) */
  height?: number;
  /** Output container format */
  format?: 'mp4' | 'webm';
  /** Provider-specific advanced options */
  options?: Record<string, unknown>;
}

/**
 * Representation of an avatar rendering job persisted in our database.
 */
export interface AvatarJob {
  /** Primary key in local DB */
  id: string;
  /** External provider (e.g. `heygen`) */
  provider: string;
  /** Provider-specific identifier returned when submitting the job */
  providerJobId: string;
  /** Current processing state */
  status: AvatarJobStatus;
  /** Final video URL once the job is completed */
  outputUrl: string | null;
  /** Error message if the job failed */
  errorMessage?: string | null;
  /** The original request data */
  request: AvatarRequest;
  /** Raw provider payload for debugging / audit */
  payload?: unknown;
  createdAt: string;
  updatedAt: string;
}

export type AvatarTemplate = {
  id: string;
  name: string;
  thumbnailUrl?: string;
};

export type VoiceTemplate = {
  id: string;
  name: string;
  language?: string;
  gender?: string;
  previewUrl?: string;
};

/**
 * Provider driver contract – every avatar vendor must implement these methods.
 */
export interface AvatarProvider {
  /**
   * Submit a new render job.
   * @returns Provider job id that can be used to poll status.
   */
  submit(request: AvatarRequest): Promise<{ jobId: string }>;

  /**
   * Fetch the current status and output URL for a job.
   */
  fetchStatus(jobId: string): Promise<{
    status: AvatarJobStatus;
    outputUrl?: string | null;
    errorMessage?: string | null;
    raw?: unknown;
  }>;

  /**
   * Handle a webhook callback from the provider. Optional – providers without
   * webhooks can ignore this.
   */
  handleWebhook?(payload: unknown): Promise<{
    jobId: string;
    status: AvatarJobStatus;
    outputUrl?: string | null;
    errorMessage?: string | null;
    raw?: unknown;
  }>;

  /** List available avatar templates */
  listAvatars?(): Promise<AvatarTemplate[]>;
  listVoices?(): Promise<VoiceTemplate[]>;
} 