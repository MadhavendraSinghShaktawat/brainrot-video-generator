'use client';

import React, {useCallback, useMemo, useState, useEffect} from 'react';
import dynamic from 'next/dynamic';
import {createTikTokStyleCaptions, parseSrt} from '@remotion/captions';
import type {Caption} from '@remotion/captions';
import {TikTokCaptionVideo, TikTokPage} from '../../../remotion/components/tiktok-caption-video';
import {Separator} from '../../components/ui/separator';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '../../components/ui/card';
import {Button} from '../../components/ui/button';

// Casting to any because the types are only available after the dependency is installed.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Player: any = dynamic(() => import('@remotion/player').then((mod) => mod.Player as any), {
  ssr: false,
});

const FPS = 30;
const WIDTH = 1080;
const HEIGHT = 1920;

/**
 * Subtitle Generator page using Remotion.
 */
const SubtitleGeneratorPage: React.FC = () => {
  const [pages, setPages] = useState<TikTokPage[]>([]);
  const [durationInFrames, setDurationInFrames] = useState<number>(FPS * 4); // Default 4s
  const [combineMs, setCombineMs] = useState<number>(1200);
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [mode, setMode] = useState<'srt' | 'audio'>('srt');
  const [isLoading, setIsLoading] = useState(false);

  const handleSrtChange: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    try {
      const {captions} = parseSrt({input: text});
      setCaptions(captions);
      processCaptions(captions, combineMs);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to parse SRT', err);
    }
  };

  const handleAudioChange: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const form = new FormData();
    form.append('file', file);
    setIsLoading(true);
    try {
      const res = await fetch('/api/generate-srt', {
        method: 'POST',
        body: form,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to transcribe');
      const {captions: generatedCaptions} = json as {captions: Caption[]};
      setCaptions(generatedCaptions);
      processCaptions(generatedCaptions, combineMs);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Transcription failed', err);
    } finally {
      setIsLoading(false);
    }
  };

  const processCaptions = useCallback(
    (captions: Caption[], combineWithin: number) => {
      const {pages: generatedPages} = createTikTokStyleCaptions({
        captions,
        combineTokensWithinMilliseconds: combineWithin,
      });
      setPages(generatedPages as unknown as TikTokPage[]);
      const lastEndMs = captions.at(-1)?.endMs ?? 0;
      setDurationInFrames(Math.ceil((lastEndMs / 1000) * FPS));
    },
    []
  );

  // Re-create pages if combineMs changes and we already have captions.
  useEffect(() => {
    if (captions.length > 0) {
      processCaptions(captions, combineMs);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [combineMs]);

  const videoInputProps = useMemo(() => ({pages, fps: FPS}), [pages]);

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Subtitle Generator</CardTitle>
        <CardDescription className="max-w-prose">
          Upload an SRT file or an audio file – we’ll create eye-catching TikTok-style captions and preview them instantly.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-6">
        <div className="flex flex-col gap-4">
          <div className="flex gap-4 items-center">
            <label className="font-medium">Input mode:</label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as 'srt' | 'audio')}
              className="select select-bordered"
            >
              <option value="srt">SRT file</option>
              <option value="audio">Audio file (Whisper)</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="font-medium block">
              {mode === 'srt' ? 'Subtitle (.srt)' : 'Audio'} file
            </label>
            {mode === 'srt' ? (
              <input
                type="file"
                accept=".srt"
                onChange={handleSrtChange}
                className="file-input file-input-bordered w-full"
              />
            ) : (
              <input
                type="file"
                accept="audio/*"
                onChange={handleAudioChange}
                className="file-input file-input-bordered w-full"
              />
            )}
          </div>

          <label htmlFor="combine" className="font-medium">
            Combine tokens within (ms)
          </label>
          <input
            id="combine"
            type="number"
            min={100}
            max={5000}
            step={100}
            value={combineMs}
            onChange={(e) => {
              const value = Number(e.target.value);
              setCombineMs(value);
            }}
            onBlur={() => {
              // Re-process captions with new value
              if (pages.length > 0) {
                // Recreate pages from stored captions – need original captions; skip for brevity.
              }
            }}
            className="input input-bordered w-40"
          />
        </div>

        <Separator />

        {isLoading ? (
          <p className="text-muted-foreground">Transcribing audio…</p>
        ) : pages.length > 0 ? (
          <Player
            component={TikTokCaptionVideo as any}
            inputProps={videoInputProps as any}
            durationInFrames={durationInFrames}
            compositionWidth={WIDTH}
            compositionHeight={HEIGHT}
            fps={FPS}
            controls
            style={{width: 360, height: 640}}
          />
        ) : (
          <p className="text-muted-foreground">Upload an {mode === 'srt' ? 'SRT' : 'audio'} file above to see a preview.</p>
        )}
      </CardContent>

      <CardFooter className="justify-end">
        <Button variant="secondary" onClick={() => {
          setPages([]);
          setCaptions([]);
        }} disabled={isLoading || pages.length === 0}>
          Clear
        </Button>
      </CardFooter>
    </Card>
  );
};

export default SubtitleGeneratorPage; 