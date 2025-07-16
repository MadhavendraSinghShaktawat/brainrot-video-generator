import React from 'react';
import { Composition } from 'remotion';
import { JsonDrivenVideo } from './components/json-driven-video';
import type { JsonDrivenVideoProps } from './components/json-driven-video';
import { registerRoot } from 'remotion';

export const RemotionRoot: React.FC = () => {
  const emptyTimeline = {
    fps: 30,
    width: 1080,
    height: 1920,
    background: '#000000',
    events: [] as any[],
  };

  return (
    <>
      {/* @ts-ignore Remotion generic mismatch */}
      <Composition
        id="JsonDrivenVideo"
        component={JsonDrivenVideo as unknown as React.FC<Record<string, unknown>>}
        durationInFrames={150} // placeholder; real duration can be longer via props
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{ timeline: emptyTimeline } as unknown as Record<string, unknown>}
      />
    </>
  );
};

registerRoot(RemotionRoot); 