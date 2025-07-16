'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Timeline } from '@/types/timeline';
import { Timeline as TimelineComponent } from '@/components/timeline/timeline';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Save, Eye, AlertCircle, Play } from 'lucide-react';

export default function EditJsonPage() {
  const params = useParams();
  const router = useRouter();
  const timelineId = params.id as string;
  
  const [timeline, setTimeline] = useState<Timeline | null>(null);
  const [previewTimeline, setPreviewTimeline] = useState<Timeline | null>(null);
  const [jsonContent, setJsonContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(true);

  // Load timeline data
  useEffect(() => {
    const loadTimeline = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch(`/api/timelines/${timelineId}`);
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to load timeline');
        }
        
        if (!data.timeline) {
          throw new Error('Timeline data not found');
        }
        
        const timelineData = data.timeline.data;
        
        setTimeline(timelineData);
        setPreviewTimeline(timelineData);
        setJsonContent(JSON.stringify(timelineData, null, 2));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load timeline');
        console.error('Error loading timeline:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (timelineId) {
      loadTimeline();
    }
  }, [timelineId]);

  // Validate JSON content
  const validateJson = (content: string): boolean => {
    try {
      const parsed = JSON.parse(content);
      
      // Basic validation for Timeline structure
      if (!parsed.fps || !parsed.width || !parsed.height) {
        setValidationError('Timeline must have fps, width, and height properties');
        return false;
      }
      
      if (!Array.isArray(parsed.events)) {
        setValidationError('Timeline must have an events array');
        return false;
      }
      
      // Validate each event
      for (const event of parsed.events) {
        if (!event.id || !event.type || event.start === undefined || event.end === undefined) {
          setValidationError('Each event must have id, type, start, and end properties');
          return false;
        }
      }
      
      setValidationError(null);
      setPreviewTimeline(parsed);
      return true;
    } catch (err) {
      setValidationError('Invalid JSON format');
      setPreviewTimeline(null);
      return false;
    }
  };

  // Handle JSON content change
  const handleJsonChange = (value: string) => {
    setJsonContent(value);
    validateJson(value);
  };

  // Save timeline
  const handleSave = async () => {
    if (!validateJson(jsonContent)) {
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      
      const updatedTimeline = JSON.parse(jsonContent);
      
      const response = await fetch(`/api/timelines/${timelineId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: updatedTimeline,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save timeline');
      }
      
      setTimeline(updatedTimeline);
      
      // Show success message (you could implement a toast here)
      console.log('Timeline saved successfully');
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save timeline');
      console.error('Error saving timeline:', err);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading timeline...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </Button>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
              Edit Timeline JSON
            </h1>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              ID: {timelineId}
            </span>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              size="sm"
              className="flex items-center space-x-2"
              onClick={() => setShowPreview(!showPreview)}
            >
              <Eye className="h-4 w-4" />
              <span>{showPreview ? 'Hide Preview' : 'Show Preview'}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center space-x-2"
              onClick={() => router.push(`/timelines/${timelineId}/preview`)}
            >
              <Play className="h-4 w-4" />
              <span>Full Preview</span>
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSaving || !!validationError}
              className="flex items-center space-x-2"
            >
              <Save className="h-4 w-4" />
              <span>{isSaving ? 'Saving...' : 'Save'}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              <p className="text-red-700 dark:text-red-300">{error}</p>
            </div>
          </div>
        )}

        {validationError && (
          <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              <p className="text-yellow-700 dark:text-yellow-300">{validationError}</p>
            </div>
          </div>
        )}

        <div className={`grid gap-6 ${showPreview ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
          {/* JSON Editor */}
          <Card className="p-6">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Timeline JSON
              </label>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Edit the timeline configuration directly. Changes will be validated automatically.
              </p>
            </div>

            <div className="relative">
              <textarea
                value={jsonContent}
                onChange={(e) => handleJsonChange(e.target.value)}
                className="w-full h-96 p-4 font-mono text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="Enter timeline JSON..."
                spellCheck={false}
              />
            </div>

            <div className="mt-4 flex justify-between items-center">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Lines: {jsonContent.split('\n').length} | 
                Characters: {jsonContent.length}
              </div>
              <div className="flex items-center space-x-2">
                {validationError ? (
                  <span className="text-sm text-red-600 dark:text-red-400">
                    ❌ Invalid JSON
                  </span>
                ) : (
                  <span className="text-sm text-green-600 dark:text-green-400">
                    ✅ Valid JSON
                  </span>
                )}
              </div>
            </div>
          </Card>

          {/* Timeline Preview */}
          {showPreview && (
            <Card className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Timeline Preview
                </label>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Live preview of your timeline. Updates automatically when JSON is valid.
                </p>
              </div>

              <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <TimelineComponent 
                  timeline={previewTimeline || undefined} 
                  className="h-96" 
                />
              </div>

              {previewTimeline && (
                <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                  {previewTimeline.events.length} events • {previewTimeline.width}x{previewTimeline.height} • {previewTimeline.fps}fps
                </div>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
} 