import { AvatarProvider, AvatarRequest, AvatarJobStatus } from '@/types/avatar';

const API_BASE = 'https://api.heygen.com/v2';

/**
 * HeyGenProvider – driver for the HeyGen avatar rendering service.
 *
 * NOTE: This implementation purposefully keeps network logic minimal and
 *        provider-specific fields typed as `any` to avoid over-specification
 *        while the API stabilises.
 */
export class HeyGenProvider implements AvatarProvider {
  private readonly apiKey: string;

  constructor(apiKey?: string) {
    const rawKey =
      apiKey ??
      process.env.HEYGEN_API_KEY ??
      process.env.NEXT_PUBLIC_HEYGEN_API_KEY ??
      '';

    // Support keys wrapped in quotes in the .env file ("KEY")
    const cleanedKey = rawKey.replace(/^['"]|['"]$/g, '');

    if (!cleanedKey) {
      throw new Error('HEYGEN_API_KEY env variable is missing');
    }

    this.apiKey = cleanedKey;
  }

  /** Submit a new video render task to HeyGen */
  async submit(request: AvatarRequest): Promise<{ jobId: string }> {
    const body = {
      test: false,
      video_inputs: [
        {
          character: {
            type: 'avatar',
            avatar_id: request.avatarId,
            avatar_style: 'normal',
          },
          voice: {
            type: 'text',
            voice_id: request.voiceId,
            input_text: request.script,
          },
        },
      ],
      dimension: {
        width: request.width ?? 1280,
        height: request.height ?? 720,
      },
      callback_url: process.env.NEXT_PUBLIC_APP_URL
        ? `${process.env.NEXT_PUBLIC_APP_URL}/api/avatar/webhook`
        : undefined,
      ...request.options,
    };

    const res = await fetch(`${API_BASE}/video/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': this.apiKey,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`HeyGen submit failed: ${res.status} – ${text}`);
    }

    const data: any = await res.json();
    const jobId = data?.data?.task_id ?? data?.task_id ?? data?.data?.video_id ?? data?.video_id ?? data?.id;
    if (!jobId) throw new Error('HeyGen response missing task_id');
    return { jobId };
  }

  /** Fetch status for an existing HeyGen task */
  async fetchStatus(jobId: string): Promise<{ status: AvatarJobStatus; outputUrl?: string | null; errorMessage?: string | null; raw?: unknown }> {
    const urlPrimary = `${API_BASE}/video/${jobId}`; // v2 singular
    const urlFallback1 = `${API_BASE}/video_status?video_id=${jobId}`; // alt
    const urlFallback2 = `${API_BASE}/video.status?video_id=${jobId}`; // legacy
    const urlFallback3 = `https://api.heygen.com/v1/video_status.get?video_id=${jobId}`;

    let res = await fetch(urlPrimary, { headers: { 'X-Api-Key': this.apiKey } });
    if (res.status === 404) {
      res = await fetch(urlFallback1, { headers: { 'X-Api-Key': this.apiKey } });
      if (res.status === 404) {
        res = await fetch(urlFallback2, { headers: { 'X-Api-Key': this.apiKey } });
        if (res.status === 404) {
          res = await fetch(urlFallback3, { headers: { 'X-Api-Key': this.apiKey } });
        }
      }
    }

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`HeyGen status failed: ${res.status} – ${text}`);
    }

    const data: any = await res.json();
    // DEBUG: log raw status response
    console.log('🛩️ HeyGen raw status', JSON.stringify(data).slice(0, 500));
    const providerStatus: string = data?.data?.status ?? data?.status;
    let status: AvatarJobStatus;
    switch (providerStatus) {
      case 'pending':
      case 'processing':
      case 'generating':
        status = 'processing';
        break;
      case 'completed':
        status = 'completed';
        break;
      case 'failed':
      default:
        status = 'failed';
    }

    return {
      status,
      outputUrl: data?.data?.video_url ?? data?.video_url ?? null,
      errorMessage: data?.data?.error ?? data?.error ?? null,
      raw: data,
    };
  }

  /**
   * Handle HeyGen webhook payload – supports both legacy and v2 formats.
   *
   * Example payloads observed:
   * 1) { task_id: "abc", status: "completed", video_url: "https://..." }
   * 2) {
   *      event_type: "avatar_video.success",
   *      event_data: {
   *        video_id: "abc",
   *        url: "https://..."
   *      }
   *    }
   */
  async handleWebhook(payload: any): Promise<{ jobId: string; status: AvatarJobStatus; outputUrl?: string | null; errorMessage?: string | null; raw?: unknown }> {
    // Newer webhook format nests data under event_data and conveys state via event_type
    const isEventWrapper = !!payload?.event_type && !!payload?.event_data;

    const jobId: string =
      (isEventWrapper ? payload?.event_data?.video_id : undefined) ??
      payload?.task_id ??
      payload?.id ??
      '';

    // Determine status
    let providerStatus: string | undefined;

    if (isEventWrapper) {
      // event_type looks like "avatar_video.success" | "avatar_video.failed" | "avatar_video.processing"
      const parts = String(payload.event_type).split('.');
      providerStatus = parts[1] ?? 'processing';
    } else {
      providerStatus = payload?.status;
    }

    let status: AvatarJobStatus;
    switch (providerStatus) {
      case 'success':
      case 'completed':
        status = 'completed';
        break;
      case 'failed':
        status = 'failed';
        break;
      case 'pending':
      case 'processing':
      default:
        status = 'processing';
    }

    const outputUrl: string | null =
      (isEventWrapper ? payload?.event_data?.url : undefined) ??
      payload?.video_url ??
      null;

    const errorMessage: string | null =
      payload?.error ??
      (isEventWrapper ? payload?.event_data?.error : undefined) ??
      null;

    return {
      jobId,
      status,
      outputUrl,
      errorMessage,
      raw: payload,
    };
  }

  /** Fetch list of avatars/templates */
  async listAvatars() {
    const res = await fetch(`${API_BASE}/avatars`, {
      headers: { 'X-Api-Key': this.apiKey },
    });
    if (!res.ok) {
      if (res.status === 404) {
        return [];
      }
      throw new Error(`HeyGen avatars failed: ${res.status}`);
    }
    const data: any = await res.json();
    const templates = (data?.data?.avatars ?? data?.avatars ?? []).map((a: any) => ({
      id: a.avatar_id ?? a.id ?? a.character_id ?? '',
      name: a.avatar_name ?? a.name ?? a.display_name ?? a.character_name ?? 'Avatar',
      thumbnailUrl:
        a.preview_image_url ||
        a.thumbnail_image_url ||
        a.avatar_url ||
        a.preview_url ||
        a.thumb_url ||
        a.portrait_download_url ||
        a.image_url ||
        null,
    }));
    return templates;
  }

  async listVoices() {
    const res = await fetch(`${API_BASE}/voices`, {
      headers: { 'X-Api-Key': this.apiKey },
    });
    if (!res.ok) {
      if (res.status === 404) return [];
      throw new Error(`HeyGen voices failed: ${res.status}`);
    }
    const data: any = await res.json();
    const voices = (data?.data?.voices ?? data?.voices ?? []).map((v: any) => ({
      id: v.voice_id ?? v.id ?? '',
      name: v.name ?? v.voice_name ?? 'Voice',
      language: v.language,
      gender: v.gender,
      previewUrl: v.preview_audio ?? v.audio_url ?? null,
    }));
    return voices;
  }
}

export default HeyGenProvider; 