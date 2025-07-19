'use client';

import React, { useCallback, useRef, useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  ArrowUpCircle,
  CheckCircle2,
  File,
  Loader2,
  XCircle,
  Video as VideoIcon,
  Image as ImageIcon,
  Music,
  UploadCloud,
  Settings as SettingsIcon,
  Text as TextIcon,
  Sparkles,
  Save,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  ZoomIn,
  ZoomOut,
  Code,
  Eye,
  AlertCircle,
  RefreshCw,
  Camera,
  Type,
  Wand2,
  Sticker,
  Layout,
  Hash,
  Scissors,
  Search,
  FileText,
  User,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import clsx from 'clsx';
import { v4 as uuidv4 } from 'uuid';
import Image from 'next/image';
import { Timeline } from '@/components/timeline/timeline';
import { Timeline as TimelineType, TimelineEvent } from '@/types/timeline';
import { useTimelineStore } from '@/store/timeline-store';
import Editor from '@monaco-editor/react';
import dynamic from 'next/dynamic';
import EditorNav from '@/components/editor/editor-nav';
import PromptPanel from '@/components/editor/prompt-panel';
import { TimelineAction } from '@/ai/actions';
import { applyAction } from '@/lib/apply-action';
import { useAvatarRender } from '@/hooks/use-avatar-render';
import { useAvatarStatus } from '@/hooks/use-avatar-status';
import { useAvatarTemplates } from '@/hooks/use-avatar-templates';
import { useVoices } from '@/hooks/use-voices';
import { useAssets } from '@/hooks/use-assets';
const PreviewPlayer = dynamic(() => import('@/components/preview/player'), { ssr: false });

/**
 * Represents a single file being uploaded.
 */
interface UploadTask {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

type AssetType = 'video' | 'photo' | 'audio';

interface Asset {
  id: string;
  name: string;
  url: string;        // original source
  previewUrl?: string; // low-res proxy for smooth editing
  type: AssetType;
  size?: number;
  createdAt?: string;
  /** Duration in seconds – filled once metadata is read (video/audio). */
  durationSec?: number;
}

// Helper function to convert MIME type to AssetType
const mimeTypeToAssetType = (mimeType: string): AssetType => {
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('image/')) return 'photo';
  if (mimeType.startsWith('audio/')) return 'audio';
  return 'video'; // Default fallback
};

type SidebarCategory =
  | 'videos'
  | 'photos'
  | 'audio'
  | 'avatars'
  | 'text'
  | 'captions'
  | 'transcript'
  | 'effects'
  | 'stickers'
  | 'format';

interface SidebarCategoryConfig {
  id: SidebarCategory;
  label: string;
  icon: React.ElementType;
  content: React.ElementType;
}

// Content components for each sidebar category
const VideosContent: React.FC<{ assets: Asset[]; onFileSelect: () => void; uploadTasks: UploadTask[]; videoThumbs: Record<string, string>; onThumb: (id: string, data: string) => void; onDuration: (id: string, sec: number) => void }> = ({ assets, onFileSelect, uploadTasks, videoThumbs, onThumb, onDuration }) => {
  const videoAssets = assets.filter(asset => asset.type === 'video');
  
  return (
    <div className="h-full">
      {/* Upload Section */}
      <div className="p-4 border-b border-gray-700">
        <div 
          className="border-2 border-dashed border-gray-600 rounded-lg p-4 text-center hover:border-gray-500 transition-colors cursor-pointer"
          onClick={onFileSelect}
        >
          <UploadCloud className="mx-auto h-6 w-6 text-gray-400 mb-2" />
          <p className="text-sm text-gray-400">Drop videos here or click to upload</p>
        </div>
      </div>
      
      {/* Upload Progress */}
      {uploadTasks.length > 0 && (
        <div className="p-4 border-b border-gray-700">
          <h3 className="text-sm font-medium text-gray-300 mb-3">Uploading</h3>
          <div className="space-y-2">
            {uploadTasks.map((task) => (
              <div key={task.id} className="bg-gray-800 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium truncate flex-1 mr-2 text-gray-200">{task.file.name}</span>
                  {task.status === 'uploading' && <Loader2 className="h-4 w-4 animate-spin text-blue-400" />}
                  {task.status === 'success' && <CheckCircle2 className="h-4 w-4 text-green-400" />}
                  {task.status === 'error' && <XCircle className="h-4 w-4 text-red-400" />}
                </div>
                {task.status === 'uploading' && (
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${task.progress}%` }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* TRENDING Section */}
      {videoAssets.length > 0 && (
        <div className="p-4">
          <h3 className="text-sm font-medium text-gray-300 mb-3 tracking-wider">TRENDING</h3>
          <div className="grid grid-cols-2 gap-3">
            {videoAssets.slice(0, 6).map((asset) => (
              <AssetCard
                key={asset.id}
                asset={asset}
                thumb={videoThumbs[asset.id]}
                onThumb={(data) => onThumb(asset.id, data)}
                onDuration={(sec) => onDuration(asset.id, sec)}
              />
            ))}
          </div>
        </div>
      )}
      
      {/* FOR YOU Section */}
      {videoAssets.length > 6 && (
        <div className="p-4">
          <h3 className="text-sm font-medium text-gray-300 mb-3 tracking-wider">FOR YOU</h3>
          <div className="grid grid-cols-2 gap-3">
            {videoAssets.slice(6).map((asset) => (
              <AssetCard
                key={asset.id}
                asset={asset}
                thumb={videoThumbs[asset.id]}
                onThumb={(data) => onThumb(asset.id, data)}
                onDuration={(sec) => onDuration(asset.id, sec)}
              />
            ))}
          </div>
        </div>
      )}
      
      {/* Empty State */}
      {videoAssets.length === 0 && (
        <div className="p-8 text-center">
          <VideoIcon className="mx-auto h-12 w-12 text-gray-600 mb-3" />
          <p className="text-gray-400 text-sm">No videos uploaded yet</p>
          <p className="text-gray-500 text-xs mt-1">Upload videos to get started</p>
        </div>
      )}
    </div>
  );
};

const PhotosContent: React.FC<{ assets: Asset[] }> = ({ assets }) => {
  const photoAssets = assets.filter((a) => a.type === 'photo');

  if (photoAssets.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500 dark:text-gray-400">
        <Camera className="mx-auto h-12 w-12 mb-2" />
        <p>No photos uploaded yet</p>
        <p className="text-xs mt-1">Drag & drop PNG/JPEG files to add them</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h3 className="text-sm font-medium text-gray-300 mb-3 tracking-wider">PHOTOS</h3>
      <div className="grid grid-cols-2 gap-3">
        {photoAssets.map((asset) => (
          <AssetCard key={asset.id} asset={asset} />
        ))}
      </div>
    </div>
  );
};

const AudioContent: React.FC<{ assets: Asset[]; onDuration: (id: string, sec: number) => void }> = ({ assets, onDuration }) => {
  const audioAssets = assets.filter((a) => a.type === 'audio');

  if (audioAssets.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500 dark:text-gray-400">
        <Music className="mx-auto h-12 w-12 mb-2" />
        <p>No audio uploaded yet</p>
        <p className="text-xs mt-1">Drag & drop MP3/WAV files to add them</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <h3 className="text-sm font-medium text-gray-300 tracking-wider">AUDIO</h3>
      <ul className="space-y-2">
        {audioAssets.map((asset) => (
          <li
            key={asset.id}
            className="flex items-center gap-3 cursor-pointer hover:bg-gray-800/50 rounded-md p-2 group"
            draggable
            onDragStart={(e) => {
              // Provide the full asset JSON so the timeline drop handler can create the event
              e.dataTransfer.setData('application/json', JSON.stringify(asset));
              e.dataTransfer.effectAllowed = 'copy';
            }}
          >
            <Music className="h-5 w-5 text-blue-400 flex-shrink-0" />
            <span className="text-sm text-gray-200 truncate flex-1">{asset.name}</span>
            <audio
              src={asset.previewUrl ?? asset.url}
              preload="metadata"
              className="hidden"
              onLoadedMetadata={(e) => {
                const dur = (e.currentTarget as HTMLAudioElement).duration;
                if (!isNaN(dur)) onDuration(asset.id, dur);
              }}
            />
            <button
              className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-gray-400 hover:text-white"
              onClick={(e) => {
                e.stopPropagation();
                const audio = new Audio(asset.previewUrl ?? asset.url);
                audio.play();
              }}
            >
              ▶
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

const TextContent: React.FC = () => (
  <div className="p-4">
    <div className="text-center text-gray-500 dark:text-gray-400">
      <Type className="mx-auto h-12 w-12 mb-2" />
      <p>Text tools coming soon</p>
      <p className="text-xs mt-1">Add titles and text overlays</p>
    </div>
  </div>
);

const CaptionsContent: React.FC = () => (
  <div className="p-4">
    <div className="text-center text-gray-500 dark:text-gray-400">
      <Hash className="mx-auto h-12 w-12 mb-2" />
      <p>Captions coming soon</p>
      <p className="text-xs mt-1">Auto-generate and edit captions</p>
    </div>
  </div>
);

const TranscriptContent: React.FC = () => (
  <div className="p-4">
    <div className="text-center text-gray-500 dark:text-gray-400">
      <FileText className="mx-auto h-12 w-12 mb-2" />
      <p>Transcript coming soon</p>
      <p className="text-xs mt-1">View and edit video transcripts</p>
    </div>
  </div>
);

const EffectsContent: React.FC = () => {
  const trendingEffects = [
    { id: 1, name: 'Sharpen Edit', thumb: '🔪', category: 'trending' },
    { id: 2, name: 'Spooky Night', thumb: '🌙', category: 'trending' },
    { id: 3, name: 'Retro Shake', thumb: '📺', category: 'trending' },
    { id: 4, name: 'Auto Style', thumb: '🚗', category: 'trending' },
    { id: 5, name: 'Dark Night', thumb: '🌑', category: 'trending' },
    { id: 6, name: 'Diamond', thumb: '💎', category: 'trending' },
  ];
  
  const forYouEffects = [
    { id: 7, name: 'Multi Pass', thumb: '🎭', category: 'for-you' },
    { id: 8, name: 'Bright Camera', thumb: '📸', category: 'for-you' },
    { id: 9, name: 'Machete Head', thumb: '⚔️', category: 'for-you' },
    { id: 10, name: 'Play Day', thumb: '🎮', category: 'for-you' },
    { id: 11, name: 'Cartoon Style', thumb: '🎨', category: 'for-you' },
    { id: 12, name: 'Second Water', thumb: '💧', category: 'for-you' },
  ];

  return (
    <div className="h-full">
      {/* TRENDING Section */}
      <div className="p-4">
        <h3 className="text-sm font-medium text-gray-300 mb-3 tracking-wider">TRENDING</h3>
        <div className="grid grid-cols-2 gap-3">
          {trendingEffects.map((effect) => (
            <div key={effect.id} className="group relative aspect-video bg-gray-800 rounded-lg overflow-hidden hover:ring-2 hover:ring-blue-500 transition-all cursor-pointer">
              <div className="w-full h-full flex items-center justify-center text-3xl">
                {effect.thumb}
              </div>
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all" />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-2">
                <p className="text-white text-xs font-medium truncate">{effect.name}</p>
              </div>
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Wand2 className="h-3 w-3 text-white" />
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* FOR YOU Section */}
      <div className="p-4">
        <h3 className="text-sm font-medium text-gray-300 mb-3 tracking-wider">FOR YOU</h3>
        <div className="grid grid-cols-2 gap-3">
          {forYouEffects.map((effect) => (
            <div key={effect.id} className="group relative aspect-video bg-gray-800 rounded-lg overflow-hidden hover:ring-2 hover:ring-blue-500 transition-all cursor-pointer">
              <div className="w-full h-full flex items-center justify-center text-3xl">
                {effect.thumb}
              </div>
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all" />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-2">
                <p className="text-white text-xs font-medium truncate">{effect.name}</p>
              </div>
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Wand2 className="h-3 w-3 text-white" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const StickersContent: React.FC = () => (
  <div className="p-4">
    <div className="text-center text-gray-500 dark:text-gray-400">
      <Sticker className="mx-auto h-12 w-12 mb-2" />
      <p>Stickers coming soon</p>
      <p className="text-xs mt-1">Add fun stickers and emojis</p>
    </div>
  </div>
);

const FormatContent: React.FC = () => (
  <div className="p-4">
    <div className="text-center text-gray-500 dark:text-gray-400">
      <Layout className="mx-auto h-12 w-12 mb-2" />
      <p>Format tools coming soon</p>
      <p className="text-xs mt-1">Adjust aspect ratio and resolution</p>
    </div>
  </div>
);

const AvatarsContent: React.FC = () => {
  const [script, setScript] = React.useState('');
  const [avatarId, setAvatarId] = React.useState<string | null>(null);
  const { data: voicesData, isPending: loadingVoices } = useVoices();
  const voices = voicesData?.voices ?? [];
  const [voiceId, setVoiceId] = React.useState<string | null>(null);
  const [playingVoiceId, setPlayingVoiceId] = React.useState<string | null>(null);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  // Auto-play preview when voice changes
  React.useEffect(() => {
    if (!voiceId) return;
    const voice = voices.find((v) => v.id === voiceId);
    if (!voice?.previewUrl) return;

    // Stop current
    if (audioRef.current) audioRef.current.pause();

    const audio = new Audio(voice.previewUrl);
    audioRef.current = audio;
    setPlayingVoiceId(voiceId);
    audio.play().catch(() => {});
    audio.onended = () => setPlayingVoiceId(null);
  }, [voiceId, voices]);

  const { mutate: startRender, data, error, isPending } = useAvatarRender();
  const jobId = data?.id;

  const { data: statusData } = useAvatarStatus(jobId);
  const { data: templatesData, isPending: loadingTemplates } = useAvatarTemplates();
  const templates = templatesData?.avatars ?? [];

  const addEvent = useTimelineStore((s) => s.addEvent);
  const getMaxFrame = useTimelineStore((s) => s.getMaxFrame);
  const timeline = useTimelineStore((s) => s.timeline);

  // When job completes insert video event
  React.useEffect(() => {
    if (statusData?.status === 'completed' && statusData.outputUrl) {
      const fps = timeline?.fps ?? 30;
      const start = getMaxFrame();
      const duration = fps * 300; // placeholder 10s
      addEvent({
        type: 'video',
        start,
        end: start + duration,
        src: statusData.outputUrl,
        layer: 1,
        scale: 1,
        xPct: 0,
        yPct: 0,
        maxDuration: duration,
      } as any);
    }
  }, [statusData]);

  const handleRender = () => {
    if (!script.trim() || !avatarId) return;
    startRender({ script, avatarId, voiceId: voiceId || undefined });
  };

  return (
    <div className="p-4 space-y-4">
      {/* Avatar selection grid */}
      <div>
        <p className="text-xs font-medium text-gray-400 mb-2">Choose an Avatar</p>
        {loadingTemplates && <p className="text-gray-500 text-xs">Loading avatars…</p>}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-80 overflow-y-auto">
          {templates.map((t) => (
            <button
              key={t.id}
              className={`relative rounded-lg overflow-hidden border-2 ${avatarId === t.id ? 'border-blue-500' : 'border-transparent'} focus:outline-none`}
              onClick={() => setAvatarId(t.id)}
            >
              {t.thumbnailUrl ? (
                <img
                  src={t.thumbnailUrl}
                  alt={t.name}
                  loading="lazy"
                  className="w-full h-24 object-cover"
                />
              ) : (
                <div className="w-full h-24 bg-gray-700 flex items-center justify-center text-[10px] text-gray-300 p-1 text-center">
                  {t.name}
                </div>
              )}
              <span className="absolute bottom-0 left-0 right-0 text-[10px] bg-black/60 text-white px-1 truncate">
                {t.name}
              </span>
            </button>
          ))}
        </div>
      </div>
      {/* Voice selector */}
      <div>
        <p className="text-xs font-medium text-gray-400 mb-2">Choose Voice</p>
        {loadingVoices && <p className="text-gray-500 text-xs">Loading voices…</p>}
        <select
          className="w-full bg-gray-800 border border-gray-700 rounded-md text-sm text-white p-2"
          value={voiceId ?? ''}
          onChange={(e) => setVoiceId(e.target.value || null)}
        >
          <option value="">Select voice</option>
          {voices.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>
        {/* Auto-preview handled on change; show status */}
        {voiceId && playingVoiceId === voiceId && (
          <p className="mt-1 text-xs text-blue-400">Playing preview…</p>
        )}
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1">Script</label>
        <textarea
          className="w-full rounded-md bg-gray-800 border border-gray-700 p-2 text-sm text-white focus:outline-none h-32 resize-none"
          value={script}
          onChange={(e) => setScript(e.target.value)}
          placeholder="Enter dialog for the avatar to speak"
        />
      </div>
      <button
        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md text-sm disabled:opacity-50"
        disabled={isPending || !script.trim() || !avatarId || !voiceId}
        onClick={handleRender}
      >
        {isPending ? 'Submitting…' : 'Render Speaking Avatar'}
      </button>

      {error && <p className="text-red-500 text-xs">{error.message}</p>}

      {statusData && (
        <div className="text-gray-400 text-xs">
          Status: {statusData.status}
          {statusData.outputUrl && (
            <>
              {' '}– <a href={statusData.outputUrl} target="_blank" className="underline">Preview</a>
            </>
          )}
        </div>
      )}
    </div>
  );
};

// Sidebar category configurations
const SIDEBAR_CATEGORIES: SidebarCategoryConfig[] = [
  { id: 'videos', label: 'VIDEOS', icon: VideoIcon, content: VideosContent },
  { id: 'photos', label: 'PHOTOS', icon: Camera, content: PhotosContent },
  { id: 'audio', label: 'AUDIO', icon: Music, content: AudioContent },
  { id: 'avatars', label: 'AVATARS', icon: User, content: AvatarsContent },
  { id: 'text', label: 'TEXT', icon: Type, content: TextContent },
  { id: 'captions', label: 'CAPTIONS', icon: Hash, content: CaptionsContent },
  { id: 'transcript', label: 'TRANSCRIPT', icon: FileText, content: TranscriptContent },
  { id: 'effects', label: 'EFFECTS', icon: Wand2, content: EffectsContent },
  { id: 'stickers', label: 'STICKERS', icon: Sticker, content: StickersContent },
  { id: 'format', label: 'FORMAT', icon: Layout, content: FormatContent },
];

// Helper function to calculate timeline duration from events
const getTimelineDuration = (timeline: TimelineType): number => {
  if (timeline.events.length === 0) return 0;
  return Math.max(...timeline.events.map(event => event.end));
};

// Start with empty timeline instead of sample data
const EMPTY_TIMELINE: TimelineType = {
  width: 1920,
  height: 1080,
  fps: 30,
  background: '#000000',
  events: []
};

// Helper function to convert asset to timeline event
const assetToTimelineEvent = (asset: Asset, startFrame: number = 0, fps: number = 30): Omit<TimelineEvent, 'id'> => {
  const extension = asset.name.toLowerCase().split('.').pop() || '';
  
  // Determine asset type based on file extension
  const videoExtensions = ['mp4', 'mov', 'avi', 'webm', 'mkv'];
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];
  const audioExtensions = ['mp3', 'wav', 'ogg', 'aac', 'm4a'];
  
  let type: TimelineEvent['type'];
  // Compute duration in frames based on metadata when available
  const durationFrames = asset.durationSec ? Math.round(asset.durationSec * fps) : undefined;

  let defaultDuration = durationFrames ?? 300; // initial fallback
  
  if (videoExtensions.includes(extension)) {
    type = 'video';
    defaultDuration = durationFrames ?? 900; // real duration if known
  } else if (audioExtensions.includes(extension)) {
    type = 'audio';
    defaultDuration = durationFrames ?? 900;
  } else if (imageExtensions.includes(extension)) {
    type = 'image';
    defaultDuration = 300; // 10 seconds at 30fps for images
  } else {
    type = 'video'; // Default fallback
    defaultDuration = 300;
  }
  
  const baseEvent: any = {
    type,
    start: startFrame,
    end: startFrame + defaultDuration,
    scale: 1,
    xPct: 0,
    yPct: 0,
    src: asset.url,
  } as any;

  if (type === 'audio' || type === 'video') {
    baseEvent.maxDuration = defaultDuration;
  }
  
  // Add audio-specific properties
  if (type === 'audio') {
    return {
      ...baseEvent,
      volume: 0.8
    } as Omit<TimelineEvent, 'id'>;
  }
  
  return baseEvent as Omit<TimelineEvent, 'id'>;
};

const AssetCard: React.FC<{
  asset: Asset;
  thumb?: string;
  onThumb?: (data: string) => void;
  onDuration?: (sec: number) => void;
}> = ({ asset, thumb, onThumb, onDuration }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const generateThumbnail = useCallback(() => {
    if (asset.type !== 'video' || !videoRef.current) return;

    const video = videoRef.current;
    if (video) video.crossOrigin = 'anonymous';
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

    video.addEventListener('loadedmetadata', () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      // Save duration to parent
      if (!isNaN(video.duration)) {
        (onDuration as any)?.(video.duration);
      }
      video.currentTime = 0.5; // Seek to 0.5 seconds
    }, { once: true });

    video.addEventListener('seeked', () => {
        if (ctx) {
        try {
          ctx.drawImage(video, 0, 0);
          const thumbnail = canvas.toDataURL('image/jpeg', 0.8);
          onThumb?.(thumbnail);
        } catch (err) {
          console.warn('Thumbnail generation failed due to CORS', err);
        }
      }
    }, { once: true });

    video.addEventListener('error', () => {
      setHasError(true);
    }, { once: true });

    setIsLoading(true);
    video.load();
  }, [asset, onThumb, onDuration]);

  useEffect(() => {
    if (asset.type === 'video' && !thumb && !hasError) {
      generateThumbnail();
    }
  }, [asset, thumb, hasError, generateThumbnail]);

  const renderPreview = () => {
    if (asset.type === 'video') {
    return (
        <div className="relative">
          <video
            ref={videoRef}
            className="w-full h-16 object-cover rounded-md"
            src={(asset as any).previewUrl ?? asset.url}
            muted
            playsInline
            onLoadedData={() => setIsLoading(false)}
            onError={() => {
              setIsLoading(false);
              setHasError(true);
            }}
          />
          {thumb && (
            <img
              src={thumb}
              alt={asset.name}
              className="absolute inset-0 w-full h-16 object-cover rounded-md"
            />
          )}
          {(isLoading || hasError) && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-md">
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
            </div>
          )}
        </div>
      );
    } else if (asset.type === 'photo') {
      return (
        <Image
          src={asset.url}
          alt={asset.name}
          width={128}
          height={64}
          className="w-full h-16 object-cover rounded-md"
        />
      );
    } else {
      return (
        <div className="w-full h-16 bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900 dark:to-green-800 rounded-md flex items-center justify-center">
          <Music className="h-6 w-6 text-green-600 dark:text-green-400" />
        </div>
      );
    }
  };

  const getIcon = () => {
    switch (asset.type) {
      case 'video':
        return <VideoIcon className="h-3 w-3" />;
      case 'photo':
        return <ImageIcon className="h-3 w-3" />;
      case 'audio':
        return <Music className="h-3 w-3" />;
      default:
        return <File className="h-3 w-3" />;
    }
  };

  // Handle drag start
  const handleDragStart = (e: React.DragEvent) => {
    // prefer previewUrl for quicker drag-drop preview
    const dragAsset = { ...asset, url: asset.previewUrl ?? asset.url };
    e.dataTransfer.setData('application/json', JSON.stringify(dragAsset));
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div 
      className="group relative bg-gray-800 rounded-lg overflow-hidden hover:bg-gray-700 transition-colors cursor-grab active:cursor-grabbing"
      draggable
      onDragStart={handleDragStart}
    >
      <div className="p-3">
        {renderPreview()}
        
        <div className="flex items-center gap-2 mt-2">
          <div className="text-gray-500 dark:text-gray-400">
            {getIcon()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
          {asset.name}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
              {asset.type}
            </p>
          </div>
        </div>
      </div>
      
      <div className="absolute inset-0 border-2 border-transparent group-hover:border-blue-500 rounded-lg transition-colors pointer-events-none" />
      </div>
    );
  };

const JSONEditor: React.FC<{ 
  timeline: TimelineType | null;
  onSave: (timeline: TimelineType) => void;
}> = ({ timeline, onSave }) => {
  const [jsonValue, setJsonValue] = useState('');
  const [isValid, setIsValid] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (timeline) {
      setJsonValue(JSON.stringify(timeline, null, 2));
    }
  }, [timeline]);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);
      
      const parsedTimeline = JSON.parse(jsonValue);
      
      // Basic validation
      if (!parsedTimeline.events || !Array.isArray(parsedTimeline.events)) {
        throw new Error('Timeline must have an events array');
      }
      
      if (!parsedTimeline.width || !parsedTimeline.height || !parsedTimeline.fps) {
        throw new Error('Timeline must have width, height, and fps properties');
      }
      
      onSave(parsedTimeline);
      setIsValid(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid JSON');
      setIsValid(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      setJsonValue(value);
      try {
        JSON.parse(value);
        setIsValid(true);
        setError(null);
      } catch (err) {
        setIsValid(false);
        setError('Invalid JSON syntax');
      }
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <Code className="h-5 w-5 text-gray-500" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            JSON Editor
          </h3>
          {!isValid && (
            <div className="flex items-center gap-1 text-red-500">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">Invalid JSON</span>
            </div>
          )}
        </div>
        <Button
          onClick={handleSave}
          disabled={!isValid || isSaving}
          className="flex items-center gap-2"
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save Timeline
        </Button>
      </div>
      
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 m-4 rounded-md">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <span className="text-sm text-red-700 dark:text-red-300">{error}</span>
          </div>
            </div>
          )}

      <div className="flex-1 p-4">
        <Editor
          height="100%"
          defaultLanguage="json"
          value={jsonValue}
          onChange={handleEditorChange}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            wordWrap: 'on',
            formatOnPaste: true,
            formatOnType: true,
          }}
                      />
                    </div>
                  </div>
  );
};

function EditorPageContent() {
  const [uploadTasks, setUploadTasks] = useState<UploadTask[]>([]);
  const [currentAssets, setCurrentAssets] = useState<Asset[]>([]);
  const [videoThumbs, setVideoThumbs] = useState<Record<string, string>>({});
  const [viewMode, setViewMode] = useState<'timeline' | 'json'>('timeline');
  const [activeCategory, setActiveCategory] = useState<SidebarCategory>('videos');
  const [previewHeight, setPreviewHeight] = useState<number>(320);
  const [promptText, setPromptText] = useState<string>('');
  const [aiStatus, setAiStatus] = useState<'idle' | 'thinking' | 'editing' | 'captioning' | 'error'>('idle');

  // ---- Prompt handling ----
  const handleRunPrompt = async () => {
    if (!promptText.trim() || aiStatus !== 'idle') return;
    setAiStatus('thinking');
    try {
      const res = await fetch('/api/ai/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promptText }),
      });

      if (!res.ok) throw new Error('AI planning failed');

      const actions: TimelineAction[] = await res.json();

      // If no actions returned we still leave thinking status for a moment
      if (!actions.length) {
        console.warn('No actions returned from AI');
      }

      const hasAutoCaption = actions.some((a) => a.type === 'autoCaption');
      setAiStatus(hasAutoCaption ? 'captioning' : 'editing');

      // Apply actions sequentially so we can await long-running ones
      for (const a of actions) {
        await applyAction(a);
      }

      setPromptText('');
      setAiStatus('idle');
    } catch (err) {
      console.error(err);
      setAiStatus('error');
      // Revert to idle after short delay to allow user see error.
      setTimeout(() => setAiStatus('idle'), 3000);
    }
  };
  
  const dragRef = useRef<HTMLDivElement | null>(null);

  // Handle vertical resize
  const handleDragMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = previewHeight;

    const onMove = (mv: MouseEvent) => {
      const delta = mv.clientY - startY;
      const newH = Math.max(160, Math.min(720, startHeight + delta));
      setPreviewHeight(newH);
    };

    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };
  
  const { 
    timeline, 
    zoom, 
    setZoom, 
    setTimeline,
    setTimelineId,
    setTimelineTitle,
    timelineId,
    isDirty,
    resetTimeline,
    addEvent,
    moveEvent,
    getEventById,
    selectedEventIds,
    deleteEvents
  } = useTimelineStore();

  // Delete key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedEventIds.length > 0) {
        e.preventDefault();
        deleteEvents(selectedEventIds);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedEventIds, deleteEvents]);

  // ---- Autosave (debounced) ----
  const saveTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Only save if there are unsaved changes and we have an ID
    if (!isDirty || !timelineId) return;

    // Clear any pending save
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    // Schedule save after 2s of inactivity
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await fetch(`/api/timelines/${timelineId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: timeline }),
        });
        // Mark as clean
        useTimelineStore.setState({ isDirty: false });
      } catch (err) {
        console.error('Autosave failed:', err);
      }
    }, 2000);

    // Cleanup on unmount
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [isDirty, timeline, timelineId]);

  // ---- Load timeline by ID (project) ----
  const searchParams = useSearchParams();
  const timelineIdParam = searchParams.get('id');

  useEffect(() => {
    if (!timelineIdParam) return;

    const fetchTimeline = async () => {
      try {
        const res = await fetch(`/api/timelines/${timelineIdParam}`);
        if (!res.ok) {
          console.error('Failed to fetch timeline:', res.statusText);
          return;
        }
        const data = await res.json();
        if (data?.timeline) {
          setTimeline(data.timeline.data);
          setTimelineId(data.timeline.id);
          setTimelineTitle(data.timeline.title);
        }
      } catch (err) {
        console.error('Error fetching timeline:', err);
      }
    };

    fetchTimeline();
    // dependencies purposely exclude setters (stable from zustand)
  }, [timelineIdParam]);

  // Ensure a blank timeline if none loaded (e.g. brand-new editor)
  useEffect(() => {
    if (!timeline && !timelineIdParam) {
      setTimeline(EMPTY_TIMELINE);
    }
  }, [timeline, timelineIdParam, setTimeline]);

  // 2) Load assets once on first mount – avoids flooding `/api/assets`
  const { data: assetVideos = [] } = useAssets('video');
  const { data: assetPhotos = [] } = useAssets('photo');
  const { data: assetAudio = [] } = useAssets('audio');

    // Merge assets whenever any list updates
    React.useEffect(() => {
      const merged: Asset[] = [
        ...assetVideos.map((v: any) => ({
          id: v.id,
          name: v.name ?? v.id,
          url: v.url,
          previewUrl: v.previewUrl,
          type: 'video' as AssetType,
        })),
        ...assetPhotos.map((v: any) => ({
          id: v.id,
          name: v.name ?? v.id,
          url: v.url,
          previewUrl: v.previewUrl,
          type: 'photo' as AssetType,
        })),
        ...assetAudio.map((v: any) => ({
          id: v.id,
          name: v.name ?? v.id,
          url: v.url,
          previewUrl: v.previewUrl,
          type: 'audio' as AssetType,
        })),
      ];

      setCurrentAssets(merged);
    }, [assetVideos, assetPhotos, assetAudio]);

  // Expose assets globally for AI helper
  useEffect(() => {
    (window as any).currentAssets = currentAssets;
  }, [currentAssets]);

  const handleTimelineDrop = useCallback(async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();

    const BASE_PIXELS_PER_SECOND = 60;
    const rect = event.currentTarget.getBoundingClientRect();
    const offsetX = event.clientX - rect.left;
    const pixelsPerSecond = BASE_PIXELS_PER_SECOND * zoom;
    const secondsFromStart = offsetX / pixelsPerSecond;
    const startFrame = Math.max(0, Math.round(secondsFromStart * (timeline?.fps || 30)));

    // 1. Check if this is an existing timeline event being moved
    const eventDataRaw = event.dataTransfer.getData('application/timeline-event');
    if (eventDataRaw) {
      try {
        const { eventId } = JSON.parse(eventDataRaw) as { eventId: string };
        const original = getEventById(eventId);
        if (original) {
          const duration = original.end - original.start;
          moveEvent(eventId, startFrame, startFrame + duration);
          return;
        }
      } catch (err) {
        console.error('Failed to move timeline event', err);
      }
    }

    // 2. Otherwise assume it's a new asset being added
    const assetData = event.dataTransfer.getData('application/json');
    if (!assetData) return;

    try {
      let asset: Asset = JSON.parse(assetData);

      // If durationSec missing for media, load metadata synchronously
      if (!asset.durationSec && (asset.type === 'video' || asset.type === 'audio')) {
        const getDuration = (url: string, isVideo: boolean): Promise<number> => {
          return new Promise((resolve) => {
            const el = isVideo ? document.createElement('video') : document.createElement('audio');
            el.preload = 'metadata';
            el.src = url;
            el.crossOrigin = 'anonymous';
            el.onloadedmetadata = () => {
              resolve(el.duration || 0);
            };
            // Fallback timeout 3s
            setTimeout(() => resolve(0), 3000);
          });
        };

        const durSec = await getDuration(asset.previewUrl ?? asset.url, asset.type === 'video');
        if (durSec > 0) {
          asset = { ...asset, durationSec: durSec };
        }
      }

      // Collision-aware layer selection (regardless of type).
      // Find all layers that overlap the intended time range and keep bumping up until free.
      const calcFreeLayer = (start: number, end: number): number => {
        if (!timeline) return 1;

        const overlaps = (aStart: number, aEnd: number, bStart: number, bEnd: number) =>
          aStart < bEnd && bStart < aEnd;

        let candidate = 1;
        let conflict = true;
        while (conflict) {
          conflict = timeline.events.some(
            (evt) => (evt.layer ?? 1) === candidate && overlaps(evt.start, evt.end, start, end),
          );
          if (conflict) candidate += 1;
        }
        return candidate;
      };

      // Convert asset to timeline event
      const eventData = assetToTimelineEvent(asset, startFrame, timeline?.fps ?? 30) as Omit<TimelineEvent, 'id'>;
      eventData.layer = calcFreeLayer(eventData.start, eventData.end);

      addEvent(eventData);
    } catch (error) {
      console.error('Failed to handle drop:', error);
    }
  }, [zoom, timeline, addEvent, moveEvent, getEventById]);

  const handleTimelineDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  }, []);

  // Handle file upload drop events will be defined after uploadFiles function

  const uploadFiles = useCallback(async (files: File[]) => {
    files.forEach(async (file) => {
      const taskId = uuidv4();
      const task: UploadTask = {
        id: taskId,
        file,
        progress: 0,
        status: 'pending',
      };

      setUploadTasks((prev) => [...prev, task]);

      try {
        // 1. Ask backend for a signed upload URL
        const signRes = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: file.name, contentType: file.type }),
        });

        if (!signRes.ok) throw new Error('Failed to get signed URL');

        const { url } = await signRes.json() as { url: string };

        // 2. Upload the file directly to GCS
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100);
            setUploadTasks((prev) =>
              prev.map((t) => (t.id === taskId ? { ...t, progress, status: 'uploading' } : t)),
            );
          }
        });

        xhr.addEventListener('load', async () => {
          if (xhr.status === 200 || xhr.status === 201) {
            setUploadTasks((prev) =>
              prev.map((t) => (t.id === taskId ? { ...t, status: 'success', progress: 100 } : t)),
            );

            // Refresh assets list so new upload appears
            try {
              const assetType = mimeTypeToAssetType(file.type);
              const assetsRes = await fetch(`/api/assets?type=${assetType}`);
              if (assetsRes.ok) {
                const latest = await assetsRes.json();
                setCurrentAssets((prev) => {
                  // merge without duplicates by id
                  const map = new Map<string, Asset>();
                  [...prev, ...latest.map((a: any) => ({ ...a, type: assetType }))].forEach((a) => map.set(a.url, a));
                  return Array.from(map.values());
                });
              }
            } catch (err) {
              console.error('Failed to refresh assets after upload', err);
            }
          } else {
            setUploadTasks((prev) =>
              prev.map((t) => (t.id === taskId ? { ...t, status: 'error', error: `Upload failed: ${xhr.statusText}` } : t)),
            );
          }
        });

        xhr.addEventListener('error', () => {
          setUploadTasks((prev) =>
            prev.map((t) => (t.id === taskId ? { ...t, status: 'error', error: 'Network error during upload' } : t)),
          );
        });

        xhr.open('PUT', url, true);
        xhr.setRequestHeader('Content-Type', file.type);
        xhr.send(file);
      } catch (error) {
        console.error('Upload failed:', error);
        setUploadTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, status: 'error', error: (error as Error).message } : t)),
        );
      }
    });
  }, []);

  // Handle file upload drop events (defined after uploadFiles)
  const handleUploadDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const files = Array.from(event.dataTransfer.files);
    uploadFiles(files);
  }, [uploadFiles]);

  const handleUploadDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  }, []);

  const handleFileSelect = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = 'video/*,image/*,audio/*';
    input.onchange = (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || []);
      if (files.length > 0) {
        uploadFiles(files);
      }
    };
    input.click();
  }, [uploadFiles]);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const files = Array.from(event.dataTransfer.files);
    uploadFiles(files);
  }, [uploadFiles]);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  }, []);



  const handleSaveTimeline = useCallback((updatedTimeline: TimelineType) => {
    setTimeline(updatedTimeline);
    // Here you would typically save to backend
    console.log('Timeline saved:', updatedTimeline);
  }, [setTimeline]);

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <EditorNav />
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Video Editor
            </h1>
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'timeline' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('timeline')}
                className="flex items-center gap-2"
              >
                <Eye className="h-4 w-4" />
                Timeline
              </Button>
              <Button
                variant={viewMode === 'json' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('json')}
                className="flex items-center gap-2"
              >
                <Code className="h-4 w-4" />
                JSON
              </Button>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={resetTimeline}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Reset
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Professional Sidebar */}
        <aside className="flex bg-black text-white">
          {/* Category Navigation */}
          <div className="w-20 bg-black border-r border-gray-800 flex flex-col py-4">
            <div className="text-center mb-6">
              <div className="text-xs font-bold tracking-wider">
                SIMPLE<br />TOOL
                </div>
            </div>
            
            <nav className="flex-1 space-y-1">
              {SIDEBAR_CATEGORIES.map((category) => {
                const Icon = category.icon;
                const isActive = activeCategory === category.id;
                
                return (
                  <button
                    key={category.id}
                    onClick={() => setActiveCategory(category.id)}
                    className={clsx(
                      'w-full flex flex-col items-center py-3 px-2 text-xs transition-colors group',
                      isActive 
                        ? 'text-white bg-gray-800' 
                        : 'text-gray-400 hover:text-white hover:bg-gray-800'
                    )}
                  >
                    <Icon className="h-5 w-5 mb-1" />
                    <span className="text-[10px] font-medium tracking-wider">
                      {category.label}
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Content Area */}
          <div className="w-80 bg-gray-900 flex flex-col">
            {/* Header with search */}
            <div className="p-4 border-b border-gray-700">
              <div className="flex items-center gap-2 mb-3">
                <Search className="h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search effects"
                  className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex gap-2">
                <button className="px-3 py-1 bg-gray-800 text-gray-300 rounded text-xs font-medium">blur</button>
                <button className="px-3 py-1 bg-gray-800 text-gray-300 rounded text-xs font-medium">zoom</button>
                <button className="px-3 py-1 bg-gray-800 text-gray-300 rounded text-xs font-medium">retro</button>
                <button className="px-3 py-1 bg-gray-800 text-gray-300 rounded text-xs font-medium">shake</button>
                <button className="px-3 py-1 bg-gray-800 text-gray-300 rounded text-xs font-medium">rainbow</button>
              </div>
            </div>

            {/* Dynamic Content */}
            <div className="flex-1 overflow-y-auto">
              {(() => {
                const activeConfig = SIDEBAR_CATEGORIES.find(cat => cat.id === activeCategory);
                if (!activeConfig) return null;
                
                const ContentComponent = activeConfig.content;
                
                // Pass appropriate props based on the content type
                if (activeCategory === 'videos') {
                  return (
                    <ContentComponent 
                      assets={currentAssets} 
                      onFileSelect={handleFileSelect}
                      uploadTasks={uploadTasks}
                      videoThumbs={videoThumbs}
                      onThumb={(id: string, data: string) => setVideoThumbs(prev => ({ ...prev, [id]: data }))}
                      onDuration={(id: string, sec: number) => {
                        setCurrentAssets(prev => prev.map(asset => asset.id === id ? { ...asset, durationSec: sec } : asset));

                        const fpsVal = timeline?.fps ?? 30;
                        const frames = Math.round(sec * fpsVal);
                        const store = useTimelineStore.getState();
                        const tl = store.timeline;
                        if (tl) {
                          const assetUrl = currentAssets.find(a => a.id === id)?.url;
                          if (assetUrl) {
                            tl.events.forEach(ev => {
                              if ('src' in ev && ev.src === assetUrl) {
                                const newEnd = Math.min(ev.start + frames, ev.end);
                                store.resizeEvent(ev.id, ev.start, newEnd, true);
                                if (store.updateEvent) {
                                  store.updateEvent(ev.id, { maxDuration: frames } as any, false);
                                }
                              }
                            });
                          }
                        }
                      }}
                    />
                  );
                } else if (activeCategory === 'audio') {
                  return (
                    <ContentComponent
                      assets={currentAssets}
                      onDuration={(id: string, sec: number) => {
                        setCurrentAssets(prev => prev.map(asset => asset.id === id ? { ...asset, durationSec: sec } : asset));

                        const fpsVal = timeline?.fps ?? 30;
                        const frames = Math.round(sec * fpsVal);
                        const store = useTimelineStore.getState();
                        const tl = store.timeline;
                        if (tl) {
                          const assetUrl = currentAssets.find(a => a.id === id)?.url;
                          if (assetUrl) {
                            tl.events.forEach(ev => {
                              if ('src' in ev && ev.src === assetUrl) {
                                const newEnd = Math.min(ev.start + frames, ev.end);
                                store.resizeEvent(ev.id, ev.start, newEnd, true);
                                if (store.updateEvent) {
                                  store.updateEvent(ev.id, { maxDuration: frames } as any, false);
                                }
                              }
                            });
                          }
                        }
                      }}
                    />
                  );
                } else if (activeCategory === 'photos') {
                  return <ContentComponent assets={currentAssets} />;
                } else if (activeCategory === 'avatars') {
                  return <ContentComponent />;
                } else {
                  return <ContentComponent />;
                }
              })()}
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-auto">
          {viewMode === 'timeline' ? (
            <>
              {/* Preview Area */}
              <div 
                className="p-4 bg-gray-100 dark:bg-gray-900 flex-none"
                style={{ height: previewHeight }}
              >
                <PreviewPlayer timeline={timeline} />
              </div>

              {/* Drag handle */}
              <div
                ref={dragRef}
                onMouseDown={handleDragMouseDown}
                className="w-full h-2 cursor-row-resize bg-gray-300 dark:bg-gray-700"
              />
 
              {/* Timeline Area */}
              <div className="h-80 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
                <div 
                  className="h-full overflow-auto"
                  onDrop={handleTimelineDrop}
                  onDragOver={handleTimelineDragOver}
                >
                  <Timeline 
                    timeline={timeline || undefined} 
                    className="h-full"
                    zoom={zoom}
                  />
                </div>
              </div>
            </>
          ) : (
            <JSONEditor 
              timeline={timeline} 
              onSave={handleSaveTimeline}
            />
          )}
            </div>

        {/* Prompt Panel extracted as component */}
        <PromptPanel
          value={promptText}
          onChange={setPromptText}
          onRun={handleRunPrompt}
          status={aiStatus}
        />
      </div>
    </div>
  );
}

// Wrap the page content in a Suspense boundary so hooks like `useSearchParams()` are compliant with Next.js 15 requirements.
export default function EditorPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      }
    >
      <EditorPageContent />
    </Suspense>
  );
} 