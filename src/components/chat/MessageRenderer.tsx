'use client';

import React, { useState, useEffect } from 'react';
import { ChatMessage, AvatarData, VoiceData, GenerationProgressData } from '@/types/chat';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Bot, User, Play, Pause, Volume2, VolumeX, Download, Share2 } from 'lucide-react';
import AvatarGallery from './AvatarGallery';
import VoiceSelector from './VoiceSelector';
import GenerationProgress from './GenerationProgress';

/**
 * Client-safe time formatter to avoid hydration mismatches
 */
const useClientTime = (timestamp: number) => {
  const [formattedTime, setFormattedTime] = useState('');
  const [formattedDate, setFormattedDate] = useState('');

  useEffect(() => {
    const date = new Date(timestamp);
    const time = date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false // Force 24-hour format for consistency
    });
    const dateStr = date.toLocaleDateString([], { 
      month: 'short', 
      day: 'numeric' 
    });
    setFormattedTime(time);
    setFormattedDate(dateStr);
  }, [timestamp]);

  return { formattedTime, formattedDate };
};

interface MessageRendererProps {
  message: ChatMessage;
}

/**
 * TypingIndicator - animated dots for typing effect
 */
const TypingIndicator: React.FC = () => {
  return (
    <div className="flex items-center space-x-2">
      <div className="flex space-x-1">
        <div className="w-2 h-2 bg-white/40 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
        <div className="w-2 h-2 bg-white/40 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
        <div className="w-2 h-2 bg-white/40 rounded-full animate-bounce"></div>
      </div>
      <span className="text-white/60 text-sm">typing...</span>
    </div>
  );
};

/**
 * TypewriterText - animated text typing effect
 */
interface TypewriterTextProps {
  text: string;
  speed?: number;
  onComplete?: () => void;
}

const TypewriterText: React.FC<TypewriterTextProps> = ({ 
  text, 
  speed = 30, 
  onComplete 
}) => {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  // Safety check for undefined text
  const safeText = text || '';

  useEffect(() => {
    if (currentIndex < safeText.length) {
      const timer = setTimeout(() => {
        setDisplayedText(prev => prev + safeText[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, speed);

      return () => clearTimeout(timer);
    } else if (onComplete) {
      onComplete();
    }
  }, [currentIndex, safeText, speed, onComplete]);

  return (
    <span className="whitespace-pre-line">
      {displayedText}
      {currentIndex < text.length && (
        <span className="animate-pulse">|</span>
      )}
    </span>
  );
};

/**
 * VideoPreview - inline video player for chat messages
 */
interface VideoPreviewProps {
  videoUrl: string;
  title?: string;
  duration?: string;
}

const VideoPreview: React.FC<VideoPreviewProps> = ({ 
  videoUrl, 
  title = "Generated Video",
  duration = "0:30"
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowControls(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, [showControls]);

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
    setShowControls(true);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    setShowControls(true);
  };

  return (
    <div className="relative max-w-md">
      {/* Video container */}
      <div 
        className="relative aspect-video rounded-2xl overflow-hidden bg-black/20 border border-white/10 shadow-lg cursor-pointer"
        onMouseEnter={() => setShowControls(true)}
        onMouseMove={() => setShowControls(true)}
        onClick={togglePlay}
      >
        <video
          src={videoUrl}
          className="w-full h-full object-cover"
          autoPlay={isPlaying}
          muted={isMuted}
          loop
        />

        {/* Video overlay controls */}
        <div 
          className={`absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent transition-opacity duration-300 ${
            showControls ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {/* Center play button */}
          <div className="absolute inset-0 flex items-center justify-center">
            <button
              onClick={(e) => { e.stopPropagation(); togglePlay(); }}
              className="rounded-full bg-white/20 backdrop-blur-sm p-3 transition-all duration-200 hover:bg-white/30 hover:scale-110"
            >
              {isPlaying ? (
                <Pause className="h-6 w-6 text-white" />
              ) : (
                <Play className="h-6 w-6 text-white ml-0.5" />
              )}
            </button>
          </div>

          {/* Bottom controls */}
          <div className="absolute bottom-0 left-0 right-0 p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <button
                  onClick={(e) => { e.stopPropagation(); toggleMute(); }}
                  className="rounded-full bg-white/20 backdrop-blur-sm p-1.5 transition-all duration-200 hover:bg-white/30"
                >
                  {isMuted ? (
                    <VolumeX className="h-3 w-3 text-white" />
                  ) : (
                    <Volume2 className="h-3 w-3 text-white" />
                  )}
                </button>
                <span className="text-white/80 text-xs font-medium">{duration}</span>
              </div>

              <div className="flex items-center space-x-1">
                <button 
                  onClick={(e) => e.stopPropagation()}
                  className="rounded-full bg-white/20 backdrop-blur-sm p-1.5 transition-all duration-200 hover:bg-white/30"
                >
                  <Download className="h-3 w-3 text-white" />
                </button>
                <button 
                  onClick={(e) => e.stopPropagation()}
                  className="rounded-full bg-white/20 backdrop-blur-sm p-1.5 transition-all duration-200 hover:bg-white/30"
                >
                  <Share2 className="h-3 w-3 text-white" />
                </button>
              </div>
            </div>

            {/* Progress bar */}
            <div className="mt-2 w-full h-1 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full w-1/3 transition-all duration-300" />
            </div>
          </div>
        </div>

        {/* Quality indicator */}
        <div className="absolute top-2 right-2">
          <div className="rounded-full bg-black/50 backdrop-blur-sm px-2 py-1 text-xs text-white/80 font-medium">
            HD
          </div>
        </div>
      </div>

      {/* Video title */}
      <div className="mt-2 px-1">
        <h4 className="text-sm font-medium text-white/90">{title}</h4>
        <p className="text-xs text-white/60">Click to play • Ready to download</p>
      </div>
    </div>
  );
};

/**
 * ScriptSuggestions - animated script suggestion list
 */
interface ScriptSuggestionsProps {
  suggestions: string[];
  onSelect?: (suggestion: string) => void;
}

const ScriptSuggestions: React.FC<ScriptSuggestionsProps> = ({ 
  suggestions, 
  onSelect 
}) => {
  return (
    <div className="space-y-2 max-w-2xl">
      {suggestions.map((suggestion, index) => (
        <div
          key={index}
          className="group rounded-xl bg-white/5 p-3 transition-all duration-200 hover:bg-white/10 cursor-pointer"
          style={{
            animationDelay: `${index * 100}ms`,
            animation: 'slideInUp 0.6s ease-out forwards'
          }}
          onClick={() => onSelect?.(suggestion)}
        >
          <p className="text-sm leading-relaxed text-white/80 group-hover:text-white/95">
            {suggestion}
          </p>
        </div>
      ))}
    </div>
  );
};

/**
 * MessageRenderer – Modern chat bubble with animations
 */
const MessageRenderer: React.FC<MessageRendererProps> = ({ message }) => {
  const { role, type, content, data, createdAt, isTyping } = message;
  const [showTyping, setShowTyping] = useState(isTyping);
  const { formattedTime, formattedDate } = useClientTime(createdAt);





  useEffect(() => {
    if (isTyping) {
      const timer = setTimeout(() => {
        setShowTyping(false);
      }, 1500); // Show typing indicator for 1.5s
      return () => clearTimeout(timer);
    }
  }, [isTyping]);

  /* ----------------------------- Rich types ----------------------------- */
  if (type === 'video_preview' && typeof data === 'object' && data !== null) {
    const videoData = data as { url: string; title?: string; duration?: string };
    return (
      <div className="flex w-full justify-start mb-6">
        <div className="flex items-start space-x-3 max-w-[70%]">
          <Avatar className="size-10 shrink-0">
            <AvatarFallback className="bg-gradient-to-br from-purple-500 to-blue-500 text-white">
              <Bot className="w-5 h-5" />
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-sm font-medium text-white">AI Assistant</span>
              <span className="text-xs text-white/60">
                {formattedTime} • {formattedDate}
              </span>
            </div>
            <div className="text-white/90 mb-3">
              <span className="text-sm leading-relaxed">{content || ''}</span>
            </div>
            <VideoPreview 
              videoUrl={videoData.url} 
              title={videoData.title}
              duration={videoData.duration}
            />
          </div>
        </div>
      </div>
    );
  }

  if (type === 'script_suggestion' && Array.isArray(data)) {
    return (
      <div className="flex w-full justify-start mb-6">
        <div className="flex items-start space-x-3 max-w-[70%]">
          <Avatar className="size-10 shrink-0">
            <AvatarFallback className="bg-gradient-to-br from-purple-500 to-blue-500 text-white">
              <Bot className="w-5 h-5" />
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-sm font-medium text-white">AI Assistant</span>
              <span className="text-xs text-white/60">
                {formattedTime} • {formattedDate}
              </span>
            </div>
            <div className="text-white/90 mb-3">
              <span className="text-sm leading-relaxed">{content || ''}</span>
            </div>
            <ScriptSuggestions suggestions={data} />
          </div>
        </div>
      </div>
    );
  }

  if (type === 'avatar_gallery' && data) {
    return (
      <div className="flex w-full justify-start mb-6">
        <div className="flex items-start space-x-3 w-full">
          <Avatar className="size-10 shrink-0">
            <AvatarFallback className="bg-gradient-to-br from-purple-500 to-blue-500 text-white">
              <Bot className="w-5 h-5" />
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-sm font-medium text-white">AI Assistant</span>
              <span className="text-xs text-white/60">
                {formattedTime} • {formattedDate}
              </span>
            </div>
            <div className="text-white/90 mb-4">
              <span className="text-sm leading-relaxed">{content || ''}</span>
            </div>
            <AvatarGallery 
              data={data as any}
              onAvatarSelect={(avatar) => {
                // Handle avatar selection - could trigger callback to parent
                console.log('Avatar selected:', avatar);
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  if (type === 'voice_selector' && data) {
    return (
      <div className="flex w-full justify-start mb-6">
        <div className="flex items-start space-x-3 w-full">
          <Avatar className="size-10 shrink-0">
            <AvatarFallback className="bg-gradient-to-br from-purple-500 to-blue-500 text-white">
              <Bot className="w-5 h-5" />
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-sm font-medium text-white">AI Assistant</span>
              <span className="text-xs text-white/60">
                {formattedTime} • {formattedDate}
              </span>
            </div>
            <div className="text-white/90 mb-4">
              <span className="text-sm leading-relaxed">{content || ''}</span>
            </div>
            <VoiceSelector 
              data={data as any}
              onVoiceSelect={(voice) => {
                // Handle voice selection - could trigger callback to parent
                console.log('Voice selected:', voice);
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  if (type === 'generation_progress' && typeof data === 'object' && data !== null) {
    const progressData = data as GenerationProgressData;
    return (
      <div className="flex w-full justify-start mb-6">
        <div className="flex items-start space-x-3 w-full">
          <Avatar className="size-10 shrink-0">
            <AvatarFallback className="bg-gradient-to-br from-purple-500 to-blue-500 text-white">
              <Bot className="w-5 h-5" />
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-sm font-medium text-white">AI Assistant</span>
              <span className="text-xs text-white/60">
                {formattedTime} • {formattedDate}
              </span>
            </div>
            {content && (
              <div className="text-white/90 mb-4">
                <span className="text-sm leading-relaxed">{content || ''}</span>
              </div>
            )}
            <GenerationProgress 
              data={progressData}
              onRetry={() => {
                // Handle retry - could trigger callback to parent
                console.log('Retry generation for job:', progressData.jobId);
              }}
              onComplete={(videoUrl) => {
                // Handle completion - could trigger callback to parent
                console.log('Generation completed:', videoUrl);
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  /* ------------------------- Typing indicator -------------------------- */
  if (showTyping && role === 'assistant') {
    return (
      <div className="flex w-full justify-start mb-6">
        <div className="flex items-start space-x-3">
          <Avatar className="size-10 shrink-0">
            <AvatarFallback className="bg-gradient-to-br from-purple-500 to-blue-500 text-white">
              <Bot className="w-5 h-5" />
            </AvatarFallback>
          </Avatar>
          
          <div className="flex flex-col">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-sm font-medium text-white">AI Assistant</span>
              <span className="text-xs text-white/60">now</span>
            </div>
            <div className="text-white/90">
              <TypingIndicator />
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* --------------------------- Regular bubbles -------------------------- */
  const isUser = role === 'user';
  const isAssistant = role === 'assistant';

  return (
    <div 
      className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} mb-6`}
      style={{
        animation: 'slideInUp 0.4s ease-out forwards'
      }}
    >
      <div className={`flex items-start space-x-3 max-w-[70%] ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}>
        {/* Avatar */}
        <Avatar className="size-10 shrink-0">
          {isUser ? (
            <img 
              src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face&auto=format&q=80" 
              alt="User avatar"
              className="w-full h-full object-cover rounded-full"
            />
          ) : (
            <AvatarFallback className="bg-gradient-to-br from-purple-500 to-blue-500 text-white">
              <Bot className="w-5 h-5" />
            </AvatarFallback>
          )}
          </Avatar>

        <div className="flex flex-col">
          {/* Header */}
          <div className={`flex items-center space-x-2 mb-2 ${isUser ? 'flex-row-reverse space-x-reverse justify-end' : ''}`}>
            <span className="text-sm font-medium text-white">
              {isUser ? 'You' : 'AI Assistant'}
            </span>
            <span className="text-xs text-white/60">
              {formattedTime} • {formattedDate}
            </span>
          </div>

          {/* Message content */}
          {isUser ? (
            /* User message with bubble */
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-3xl px-6 py-4 text-white shadow-lg">
              <div className="text-sm leading-relaxed">
                <span className="whitespace-pre-line">{content || ''}</span>
              </div>
            </div>
          ) : (
            /* AI message without bubble */
            <div className="text-white/90">
              <div className="text-sm leading-relaxed">
                {isAssistant && !isTyping ? (
                  <TypewriterText text={content || ''} />
                ) : (
                  <span className="whitespace-pre-line">{content || ''}</span>
                )}
                {/* Thinking indicator for thinking messages */}
                {isAssistant && isTyping && (content?.includes('🤔') || content?.includes('🎤')) && (
                  <div className="flex items-center space-x-2 mt-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-xs text-white/50 italic">AI is thinking...</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageRenderer; 