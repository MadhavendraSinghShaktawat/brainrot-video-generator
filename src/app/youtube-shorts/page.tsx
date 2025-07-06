'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { NicheSelector } from '@/components/youtube-shorts/niche-selector';
import { AutomationSelector } from '@/components/youtube-shorts/automation-selector';
import { ScriptSelector } from '@/components/youtube-shorts/script-selector';
import { VoiceSelector } from '@/components/youtube-shorts/voice-selector';
import { ArrowLeft, Play, Settings, Sparkles, Zap } from 'lucide-react';

export type Niche = 'reddit-stories' | 'motivational' | 'facts' | 'gaming' | 'finance';
export type AutomationLevel = 'full' | 'partial';
export type PartialOption = 'scripts' | 'voice';

interface ProjectConfig {
  niche: Niche | null;
  automationLevel: AutomationLevel | null;
  partialOption: PartialOption | null;
  selectedScriptId?: string;
  selectedVoiceId?: string;
}

export default function YouTubeShortsPage() {
  const [step, setStep] = useState<'niche' | 'automation' | 'partial' | 'ready'>('niche');
  const [config, setConfig] = useState<ProjectConfig>({
    niche: null,
    automationLevel: null,
    partialOption: null,
  });

  const handleNicheSelect = (niche: Niche) => {
    setConfig(prev => ({ ...prev, niche }));
    setStep('automation');
  };

  const handleAutomationSelect = (automationLevel: AutomationLevel) => {
    setConfig(prev => ({ ...prev, automationLevel }));
    if (automationLevel === 'full') {
      setStep('ready');
    } else {
      setStep('partial');
    }
  };

  const handlePartialSelect = (partialOption: PartialOption) => {
    setConfig(prev => ({ ...prev, partialOption }));
    setStep('ready');
  };

  const handleScriptSelect = (scriptId: string) => {
    setConfig(prev => ({ ...prev, selectedScriptId: scriptId }));
  };

  const handleVoiceSelect = (voiceId: string) => {
    setConfig(prev => ({ ...prev, selectedVoiceId: voiceId }));
  };

  const handleBack = () => {
    if (step === 'automation') {
      setStep('niche');
      setConfig(prev => ({ ...prev, niche: null }));
    } else if (step === 'partial') {
      setStep('automation');
      setConfig(prev => ({ ...prev, automationLevel: null }));
    } else if (step === 'ready') {
      if (config.automationLevel === 'full') {
        setStep('automation');
      } else {
        setStep('partial');
      }
      setConfig(prev => ({ ...prev, partialOption: null, selectedScriptId: undefined, selectedVoiceId: undefined }));
    }
  };

  const handleGenerate = () => {
    // TODO: Implement video generation logic
    console.log('Generate video with config:', config);
    alert('Video generation will be implemented soon!');
  };

  const isReadyToGenerate = () => {
    if (config.automationLevel === 'full') {
      return config.niche && config.automationLevel;
    }
    
    if (config.partialOption === 'scripts') {
      return config.selectedScriptId;
    }
    
    if (config.partialOption === 'voice') {
      return config.selectedVoiceId;
    }
    
    return false;
  };

  const getStepNumber = () => {
    switch (step) {
      case 'niche': return 1;
      case 'automation': return 2;
      case 'partial': return 3;
      case 'ready': return config.automationLevel === 'partial' ? 4 : 3;
      default: return 1;
    }
  };

  const getTotalSteps = () => {
    return config.automationLevel === 'partial' ? 4 : 3;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-blue-950 transition-colors duration-500">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Enhanced Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            {step !== 'niche' && (
              <Button
                variant="ghost"
                onClick={handleBack}
                className="flex items-center gap-2 hover:bg-white/60 dark:hover:bg-gray-800/60 backdrop-blur-sm transition-all duration-200"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            )}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-gradient-to-r from-red-500 to-pink-500 rounded-xl shadow-lg">
                  <Play className="h-6 w-6 text-white" />
                </div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                  YouTube Shorts Generator
                </h1>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-lg">
                Create engaging short videos with AI-powered automation
              </p>
            </div>
          </div>

          {/* Enhanced Progress Steps */}
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              {Array.from({ length: getTotalSteps() }).map((_, index) => (
                <div key={index} className="flex items-center">
                  <div 
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 ${
                      index + 1 <= getStepNumber() 
                        ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg scale-110' 
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {index + 1 <= getStepNumber() ? (
                      index + 1 === getStepNumber() ? (
                        <Sparkles className="h-4 w-4" />
                      ) : (
                        '✓'
                      )
                    ) : (
                      index + 1
                    )}
                  </div>
                  {index < getTotalSteps() - 1 && (
                    <div 
                      className={`w-16 h-1 mx-2 rounded-full transition-all duration-500 ${
                        index + 1 < getStepNumber() 
                          ? 'bg-gradient-to-r from-blue-500 to-purple-500' 
                          : 'bg-gray-200 dark:bg-gray-700'
                      }`} 
                    />
                  )}
                </div>
              ))}
            </div>
            
            <div className="flex justify-between text-sm">
              <span className={`transition-colors duration-200 ${step === 'niche' ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
                Choose Niche
              </span>
              <span className={`transition-colors duration-200 ${step === 'automation' ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
                Automation Level
              </span>
              {config.automationLevel === 'partial' && (
                <span className={`transition-colors duration-200 ${step === 'partial' ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
                  Content Selection
                </span>
              )}
              <span className={`transition-colors duration-200 ${step === 'ready' ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
                Ready to Generate
              </span>
            </div>
          </div>
        </div>

        {/* Enhanced Content with animations */}
        <div className="space-y-8">
          <div className="animate-fadeIn">
            {step === 'niche' && (
              <NicheSelector onSelect={handleNicheSelect} />
            )}

            {step === 'automation' && config.niche && (
              <AutomationSelector 
                niche={config.niche} 
                onSelect={handleAutomationSelect} 
              />
            )}

            {step === 'partial' && config.niche && (
              <div className="space-y-8">
                <div className="text-center">
                  <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                    Choose Your Content Source
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 text-lg">
                    Select how you want to provide content for your video
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                  <Card className="p-8 hover:shadow-2xl transition-all duration-300 hover:scale-105 border-2 hover:border-blue-200 dark:hover:border-blue-800 bg-gradient-to-br from-white to-blue-50/50 dark:from-gray-800 dark:to-blue-950/30">
                    <div className="text-center">
                      <div className="p-4 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                        <Settings className="h-8 w-8 text-white" />
                      </div>
                      <h3 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">Use Existing Scripts</h3>
                      <p className="text-gray-600 dark:text-gray-400 mb-6 text-lg">
                        Choose from your previously generated scripts and let AI handle the rest
                      </p>
                      <Button 
                        onClick={() => handlePartialSelect('scripts')}
                        className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                        size="lg"
                      >
                        Select Scripts
                      </Button>
                    </div>
                  </Card>

                  <Card className="p-8 hover:shadow-2xl transition-all duration-300 hover:scale-105 border-2 hover:border-green-200 dark:hover:border-green-800 bg-gradient-to-br from-white to-green-50/50 dark:from-gray-800 dark:to-green-950/30">
                    <div className="text-center">
                      <div className="p-4 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                        <Zap className="h-8 w-8 text-white" />
                      </div>
                      <h3 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">Use Generated Voice</h3>
                      <p className="text-gray-600 dark:text-gray-400 mb-6 text-lg">
                        Use voice from already generated scripts for consistent quality
                      </p>
                      <Button 
                        onClick={() => handlePartialSelect('voice')}
                        className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                        size="lg"
                      >
                        Select Voice
                      </Button>
                    </div>
                  </Card>
                </div>
              </div>
            )}

            {step === 'ready' && (
              <div className="space-y-8">
                {config.automationLevel === 'full' && (
                  <Card className="p-8 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 border-2 border-blue-200 dark:border-blue-800 shadow-xl">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl">
                        <Zap className="h-6 w-6 text-white" />
                      </div>
                      <h3 className="text-2xl font-semibold text-gray-900 dark:text-white">Full Automation Ready</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3 text-gray-700 dark:text-gray-300">
                        <p><strong className="text-blue-600 dark:text-blue-400">Niche:</strong> {config.niche?.replace('-', ' ').toUpperCase()}</p>
                        <p><strong className="text-blue-600 dark:text-blue-400">Mode:</strong> Full Automation</p>
                        <p><strong className="text-blue-600 dark:text-blue-400">Features:</strong> AI-generated content from start to finish</p>
                      </div>
                      <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-4">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          The system will automatically generate ideas, create engaging scripts, 
                          generate natural voice narration, select appropriate background video, 
                          and add subtitles with effects optimized for YouTube Shorts.
                        </p>
                      </div>
                    </div>
                  </Card>
                )}

                {config.partialOption === 'scripts' && (
                  <ScriptSelector 
                    onSelect={handleScriptSelect}
                    selectedScriptId={config.selectedScriptId}
                  />
                )}

                {config.partialOption === 'voice' && (
                  <VoiceSelector 
                    onSelect={handleVoiceSelect}
                    selectedVoiceId={config.selectedVoiceId}
                  />
                )}

                <Card className="p-8 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-2 border-green-200 dark:border-green-800 shadow-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl">
                        <Play className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-semibold mb-2 text-gray-900 dark:text-white">Ready to Generate</h3>
                        <p className="text-gray-600 dark:text-gray-400 text-lg">
                          Everything is configured! Click generate to create your YouTube Short
                        </p>
                      </div>
                    </div>
                    <Button 
                      onClick={handleGenerate}
                      disabled={!isReadyToGenerate()}
                      className="flex items-center gap-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 disabled:from-gray-400 disabled:to-gray-500 text-white shadow-lg hover:shadow-xl disabled:shadow-none hover:scale-105 disabled:scale-100 transition-all duration-200"
                      size="lg"
                    >
                      <Play className="h-5 w-5" />
                      Generate Video
                    </Button>
                  </div>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 