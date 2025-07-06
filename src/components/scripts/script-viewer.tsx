'use client';

import React, { useState } from 'react';
import { GeneratedScript } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScriptToVoice } from './script-to-voice';
import { 
  Copy, 
  Clock, 
  Type, 
  Star,
  X,
  Check,
  Mic,
  Volume2
} from 'lucide-react';

interface ScriptViewerProps {
  script: GeneratedScript;
  onClose: () => void;
  onCopy?: (text: string) => void;
}

export const ScriptViewer: React.FC<ScriptViewerProps> = ({
  script,
  onClose,
  onCopy
}) => {
  const [copied, setCopied] = useState(false);
  const [showVoiceGenerator, setShowVoiceGenerator] = useState(false);
  const [showAudio, setShowAudio] = useState(false);

  const handleCopy = async (text: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      onCopy?.(text);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy text:', error);
    }
  };

  const formatScriptContent = (content: string): React.ReactElement[] => {
    const paragraphs = content.split('\n\n');
    return paragraphs.map((paragraph, index) => (
      <p key={index} className="mb-4 leading-relaxed">
        {paragraph}
      </p>
    ));
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex-1">
              <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">
                {script.title}
              </CardTitle>
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>{script.estimated_duration}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Type className="h-4 w-4" />
                  <span>{script.word_count} words</span>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4" />
                  <span className="capitalize">{script.style} style</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="capitalize">{script.length} length</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {(script as any).audio_url && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAudio(!showAudio)}
                >
                  <Volume2 className="h-4 w-4 mr-2" />
                  {showAudio ? 'Hide Audio' : 'Play Audio'}
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowVoiceGenerator(true)}
              >
                <Mic className="h-4 w-4 mr-2" />
                Generate Voice
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopy(script.script_content)}
                disabled={copied}
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Script
                  </>
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="max-h-[70vh] overflow-y-auto">
            {showAudio && (script as any).audio_url && (
              <div className="mb-6">
                <audio controls className="w-full">
                  <source src={(script as any).audio_url} type="audio/wav" />
                </audio>
              </div>
            )}
            <div className="prose prose-gray dark:prose-invert max-w-none">
              {formatScriptContent(script.script_content)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Voice Generation Modal */}
      {showVoiceGenerator && (
        <ScriptToVoice 
          script={script}
          onClose={() => setShowVoiceGenerator(false)}
        />
      )}
    </>
  );
}; 