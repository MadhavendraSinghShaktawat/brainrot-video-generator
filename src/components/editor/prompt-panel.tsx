import React from 'react';
import { Sparkles, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface PromptPanelProps {
  value: string;
  onChange: (val: string) => void;
  onRun: () => void;
  status?: 'idle' | 'thinking' | 'editing' | 'captioning' | 'error';
}

/**
 * PromptPanel
 * --------------
 * Displays a premium-looking prompt input on the right-hand side of the editor.
 * Keeps styling consistent with the dark theme without occupying the entire
 * screen height – it grows with its container and becomes scrollable if the
 * textarea expands.
 */
const PromptPanel: React.FC<PromptPanelProps> = ({ value, onChange, onRun, status = 'idle' }) => {
  return (
    <aside className="w-80 border-l border-gray-800 bg-gray-900/60 backdrop-blur-xl p-6 flex flex-col">
      {/* Decorative gradient ring */}
      <div className="relative rounded-2xl p-px bg-gradient-to-br from-indigo-500/40 via-purple-500/30 to-blue-500/20">
        <Card className="h-full flex flex-col bg-gray-900/80 border-none rounded-2xl shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Sparkles className="h-5 w-5 text-purple-300" />
              Prompt
            </CardTitle>
            <CardDescription className="text-gray-400">
              Ask the editor to perform an action
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col">
            <textarea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="e.g. Center the image and add a drop shadow"
              className="flex-1 resize-none rounded-xl bg-transparent border border-white/10 p-4 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/40 transition-colors"
            />

            {/* Status indicator */}
            {status !== 'idle' && (
              <div className="mt-4 flex items-center gap-2 text-sm">
                {status === 'thinking' && <Loader2 className="h-4 w-4 animate-spin text-blue-400" />}
                {status === 'editing' && <CheckCircle2 className="h-4 w-4 text-green-400" />}
                {status === 'captioning' && <Loader2 className="h-4 w-4 animate-spin text-blue-400" />}
                {status === 'error' && <AlertCircle className="h-4 w-4 text-red-400" />}
                <span className="text-gray-300">
                  {status === 'thinking' && 'Thinking...'}
                  {status === 'editing' && 'Applying edits...'}
                  {status === 'captioning' && 'Generating captions...'}
                  {status === 'error' && 'Something went wrong'}
                </span>
              </div>
            )}

            <Button
              size="sm"
              className="mt-4 self-end bg-gradient-to-r from-purple-500 to-indigo-500 text-white hover:from-purple-600 hover:to-indigo-600 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 disabled:opacity-50 disabled:pointer-events-none transition-colors"
              disabled={!value.trim() || status !== 'idle'}
              onClick={onRun}
            >
              Run
            </Button>
          </CardContent>
        </Card>
      </div>
    </aside>
  );
};

export default PromptPanel; 