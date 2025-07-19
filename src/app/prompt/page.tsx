"use client";

import { useState, useEffect } from "react";
import PromptChat from "@/components/chat/PromptChat";
import { Play, Pause, Volume2, VolumeX, Download, Share2, MoreHorizontal } from "lucide-react";

/**
 * Client-only floating particles to avoid hydration mismatch
 */
const FloatingParticles = () => {
  const [particles, setParticles] = useState<Array<{
    id: number;
    left: number;
    top: number;
    delay: number;
    duration: number;
  }>>([]);

  useEffect(() => {
    // Generate particles only on client to avoid hydration mismatch
    const newParticles = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      delay: Math.random() * 5,
      duration: 2 + Math.random() * 3,
    }));
    setParticles(newParticles);
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute h-1 w-1 bg-white/20 rounded-full animate-pulse"
          style={{
            left: `${particle.left}%`,
            top: `${particle.top}%`,
            animationDelay: `${particle.delay}s`,
            animationDuration: `${particle.duration}s`
          }}
        />
      ))}
    </div>
  );
};

/**
 * PromptPage – Modern split-view video creation interface
 * Features:
 * - Full-width chat until video is generated
 * - Smooth transition to split-view with video preview
 * - Modern video player with custom controls
 * - Beautiful gradient backgrounds and animations
 */
export default function PromptPage() {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);

  const handleVideoReady = (url: string) => {
    setVideoUrl(url);
    setIsPlaying(true);
  };

  // Hide controls after 3 seconds of inactivity
  useEffect(() => {
    if (!videoUrl) return;
    
    const timer = setTimeout(() => {
      setShowControls(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, [videoUrl, showControls]);

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
    setShowControls(true);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    setShowControls(true);
  };

  return (
    <main className="relative flex min-h-screen w-full overflow-hidden bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-900">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-purple-500/10 blur-[120px] animate-pulse" />
        <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-blue-500/10 blur-[120px] animate-pulse [animation-delay:2s]" />
        <div className="absolute top-1/2 left-1/2 h-64 w-64 rounded-full bg-pink-500/5 blur-[80px] animate-pulse [animation-delay:4s]" />
      </div>

      {/* Floating particles - Client-only to avoid hydration mismatch */}
      <FloatingParticles />

      <div
        className={`flex w-full transition-all duration-700 ease-in-out ${
        videoUrl ? 'flex-col lg:flex-row' : 'flex-col'
      }`}
    >
        {/* Chat Section */}
      <section
          className={`relative z-10 flex flex-col transition-all duration-700 ease-in-out ${
            videoUrl 
              ? 'h-screen lg:h-screen lg:w-[480px] xl:w-[520px]' 
              : 'h-screen w-full'
          }`}
        >
          {/* Glass morphism background */}
          <div className="absolute inset-0 bg-white/5 backdrop-blur-xl border-r border-white/10" />
          
          {/* Content */}
          <div className="relative z-10 h-full">
        <PromptChat onVideoGenerated={handleVideoReady} />
          </div>
      </section>

        {/* Video Preview Section */}
      {videoUrl && (
          <section className="flex-1 flex flex-col justify-center items-center p-6 lg:p-8 xl:p-12 relative">
            <div 
              className="relative w-full max-w-4xl group"
              style={{
                animation: 'slideInRight 0.7s ease-out forwards'
              }}
            >
              {/* Video container */}
              <div className="relative aspect-video w-full rounded-3xl overflow-hidden bg-black/50 backdrop-blur-sm border border-white/20 shadow-2xl">
          <video
            src={videoUrl}
                  className="w-full h-full object-cover"
                  autoPlay={isPlaying}
                  muted={isMuted}
                  loop
                  onMouseEnter={() => setShowControls(true)}
                  onMouseMove={() => setShowControls(true)}
                />

                {/* Custom video controls overlay */}
                <div 
                  className={`absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent transition-opacity duration-300 ${
                    showControls ? 'opacity-100' : 'opacity-0'
                  }`}
                >
                  {/* Center play button */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <button
                      onClick={togglePlay}
                      className="rounded-full bg-white/20 backdrop-blur-sm p-4 transition-all duration-200 hover:bg-white/30 hover:scale-110"
                    >
                      {isPlaying ? (
                        <Pause className="h-8 w-8 text-white" />
                      ) : (
                        <Play className="h-8 w-8 text-white ml-1" />
                      )}
                    </button>
                  </div>

                  {/* Bottom controls */}
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <button
                          onClick={togglePlay}
                          className="rounded-full bg-white/20 backdrop-blur-sm p-2 transition-all duration-200 hover:bg-white/30"
                        >
                          {isPlaying ? (
                            <Pause className="h-4 w-4 text-white" />
                          ) : (
                            <Play className="h-4 w-4 text-white ml-0.5" />
                          )}
                        </button>

                        <button
                          onClick={toggleMute}
                          className="rounded-full bg-white/20 backdrop-blur-sm p-2 transition-all duration-200 hover:bg-white/30"
                        >
                          {isMuted ? (
                            <VolumeX className="h-4 w-4 text-white" />
                          ) : (
                            <Volume2 className="h-4 w-4 text-white" />
                          )}
                        </button>

                        <div className="text-white/80 text-sm font-medium">
                          Generated Video Preview
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button className="rounded-full bg-white/20 backdrop-blur-sm p-2 transition-all duration-200 hover:bg-white/30">
                          <Download className="h-4 w-4 text-white" />
                        </button>
                        <button className="rounded-full bg-white/20 backdrop-blur-sm p-2 transition-all duration-200 hover:bg-white/30">
                          <Share2 className="h-4 w-4 text-white" />
                        </button>
                        <button className="rounded-full bg-white/20 backdrop-blur-sm p-2 transition-all duration-200 hover:bg-white/30">
                          <MoreHorizontal className="h-4 w-4 text-white" />
                        </button>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="mt-4 w-full h-1 bg-white/20 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full w-1/3 transition-all duration-300" />
                    </div>
                  </div>
                </div>

                {/* Video quality indicator */}
                <div className="absolute top-4 right-4">
                  <div className="rounded-full bg-black/50 backdrop-blur-sm px-3 py-1 text-xs text-white/80 font-medium">
                    HD 1080p
                  </div>
                </div>
              </div>

              {/* Video metadata */}
              <div className="mt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-white">Your Generated Video</h3>
                    <p className="text-white/60 text-sm">Created just now • Ready to download</p>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <div className="px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-medium">
                      ✓ Generated
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap gap-3">
                  <button className="flex items-center space-x-2 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 px-6 py-3 text-white font-medium transition-all duration-200 hover:shadow-lg hover:scale-105">
                    <Download className="h-4 w-4" />
                    <span>Download Video</span>
                  </button>
                  
                  <button className="flex items-center space-x-2 rounded-xl bg-white/10 backdrop-blur-sm px-6 py-3 text-white font-medium transition-all duration-200 hover:bg-white/20 border border-white/20">
                    <Share2 className="h-4 w-4" />
                    <span>Share</span>
                  </button>

                  <button className="flex items-center space-x-2 rounded-xl bg-white/10 backdrop-blur-sm px-6 py-3 text-white font-medium transition-all duration-200 hover:bg-white/20 border border-white/20">
                    <span>Create Another</span>
                  </button>
                </div>
              </div>
            </div>
        </section>
      )}
      </div>

      {/* Custom CSS for animations */}
      <style jsx>{`
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(100px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </main>
  );
} 