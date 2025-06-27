import type { Metadata } from 'next';
import { IdeaGenerator } from '@/components/idea-generator/idea-generator';

export const metadata: Metadata = {
  title: 'Viral Story Ideas Generator | Brainrot Video Generator',
  description: 'Generate viral Reddit-style story ideas using AI. Create engaging content that is scientifically designed to go viral.',
};

export default function GenerateIdeasPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <IdeaGenerator />
    </div>
  );
} 