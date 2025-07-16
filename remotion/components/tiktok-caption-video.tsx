import React from 'react';
import {AbsoluteFill, Sequence} from 'remotion';

/**
 * Represents a single token within a caption page.
 */
export interface TikTokToken {
  text: string;
  fromMs: number;
  toMs: number;
}

/**
 * Represents a page created by `createTikTokStyleCaptions()`.
 */
export interface TikTokPage {
  text: string;
  startMs: number;
  tokens: TikTokToken[];
}

export interface TikTokCaptionVideoProps {
  /**
   * Pages of captions created by `createTikTokStyleCaptions()`.
   */
  pages: TikTokPage[];
  /**
   * Frames per second of the parent composition.
   * Needed to translate milliseconds to frames.
   */
  fps: number;
  /**
   * Optional styling overrides.
   */
  fontFamily?: string;
}

/**
 * Remotion composition that renders TikTok-style captions.
 * It assumes a vertical 1080×1920 frame but works in any aspect ratio.
 */
export const TikTokCaptionVideo: React.FC<TikTokCaptionVideoProps> = ({
  pages,
  fps,
  fontFamily = 'Bebas Neue, sans-serif',
}) => {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: 'green',
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingBottom: '10%',
      }}
    >
      {pages.map((page, index) => {
        // Translate the page start to the frame it should appear on.
        const fromFrame = Math.round((page.startMs / 1000) * fps);
        const endMs = page.tokens.length > 0 ? page.tokens[page.tokens.length - 1].toMs : page.startMs + 1000;
        const toFrame = Math.round((endMs / 1000) * fps);
        const durationFrames = Math.max(1, toFrame - fromFrame);
        return (
          <Sequence key={index} from={fromFrame} durationInFrames={durationFrames}>
            <AbsoluteFill
              style={{
                justifyContent: 'flex-end',
                alignItems: 'center',
                paddingBottom: '92%',
                whiteSpace: 'pre', // preserve spaces inside caption text
              }}
            >
              <span
                style={{
                  fontFamily,
                  fontSize: 120,
                  letterSpacing: 1,
                  lineHeight: 1.1,
                  color: 'white',
                  textShadow: '0 0 6px rgba(0,0,0,0.9)',
                }}
              >
                {page.text}
              </span>
            </AbsoluteFill>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
}; 