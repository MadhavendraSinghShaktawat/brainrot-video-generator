import React from 'react';
import { AbsoluteFill, Sequence, Video, Audio, Img } from 'remotion';
import { Timeline, TimelineEvent } from '@/types/timeline';

/**
 * Renders a video based on a Timeline JSON definition.
 * Supports video, audio, image and caption events.
 */
export interface JsonDrivenVideoProps {
  timeline: Timeline;
}

const renderEvent = (
  event: TimelineEvent,
  fps: number,
  compW: number,
  compH: number
) => {
  // Compute transform for positioning
  const offsetX = (event as any).xPct ? (event as any).xPct * compW : 0;
  const offsetY = (event as any).yPct ? (event as any).yPct * compH : 0;
  const scale = (event as any).scale ?? 1;

  const transform = `translate(-50%,-50%) translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
  const from = event.start;
  const duration = Math.max(1, event.end - event.start);
  const commonStyle: React.CSSProperties = {
    position: 'absolute',
    width: '100%',
    height: '100%',
    top: '50%',
    left: '50%',
    transform,
    transformOrigin: 'center',
  };

  switch (event.type) {
    case 'video':
      return (
        <Sequence key={event.id} from={from} durationInFrames={duration}>
          <Video
            src={event.src}
            startFrom={event.trimIn ?? 0}
            endAt={event.trimOut}
            style={{ ...commonStyle }}
            muted
          />
        </Sequence>
      );
    case 'audio':
      return (
        <Sequence key={event.id} from={from} durationInFrames={duration}>
          <Audio
            src={event.src}
            startFrom={event.trimIn ?? 0}
            endAt={event.trimOut}
            volume={event.volume ?? 1}
          />
        </Sequence>
      );
    case 'image':
      return (
        <Sequence key={event.id} from={from} durationInFrames={duration}>
          <Img src={event.src} style={{ ...commonStyle, objectFit: 'contain' }} />
        </Sequence>
      );
    case 'caption':
      // Note: Animation properties are ignored for now
      if (event.animation) {
        // eslint-disable-next-line no-console
        console.log(`⚠️ Animation properties found for caption "${event.text}" but not implemented yet`);
      }
      
      return (
        <Sequence key={event.id} from={from} durationInFrames={duration}>
          <AbsoluteFill
            style={{
              justifyContent: 'center',
              alignItems: 'center',
              color: 'white',
              fontSize: 80,
              fontWeight: 'bold',
              textAlign: 'center',
              textShadow: '0 0 10px rgba(0,0,0,0.7)',
              ...((event.style ?? {}) as React.CSSProperties),
            }}
          >
            <span>{event.text}</span>
          </AbsoluteFill>
        </Sequence>
      );
    default:
      return null;
  }
};

export const JsonDrivenVideo: React.FC<any> = (props) => {
  // Debug: log full props
  // eslint-disable-next-line no-console
  console.log('🎬 JsonDrivenVideo received props:', JSON.stringify(props, null, 2));
  
  // Detect whether the timeline is passed directly (root-level) or wrapped in {timeline}
  const hasDirectTimeline = Array.isArray((props as any).events);
  
  // eslint-disable-next-line no-console
  console.log('🔍 hasDirectTimeline:', hasDirectTimeline);
  // eslint-disable-next-line no-console
  console.log('🔍 props.events is array:', Array.isArray(props.events));
  // eslint-disable-next-line no-console
  console.log('🔍 props.timeline exists:', !!props.timeline);

  const timeline: Timeline = hasDirectTimeline
    ? (props as unknown as Timeline)
    : (props.timeline as Timeline);
    
  // Debug: log resolved timeline
  // eslint-disable-next-line no-console
  console.log('📊 Resolved timeline:', timeline);
  
  // Validate timeline structure
  if (!timeline) {
    // eslint-disable-next-line no-console
    console.error('❌ No timeline found in props!');
    return null;
  }
  
  if (!timeline.fps) {
    // eslint-disable-next-line no-console
    console.error('❌ No fps found in timeline!');
    return null;
  }
  
  if (!timeline.events || !Array.isArray(timeline.events)) {
    // eslint-disable-next-line no-console
    console.error('❌ No events array found in timeline!');
    return null;
  }
  
  const { fps, width, height, background, events } = timeline;
  
  // eslint-disable-next-line no-console
  console.log('✅ Timeline structure valid:', {
    fps,
    width,
    height,
    background,
    eventsCount: events.length
  });

  return (
    <AbsoluteFill style={{ backgroundColor: background ?? '#000' }}>
      {events
        .sort((a, b) => (a.layer ?? 0) - (b.layer ?? 0))
        .map((e) => renderEvent(e, fps, width, height))}
    </AbsoluteFill>
  );
}; 