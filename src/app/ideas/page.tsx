import type { Metadata } from 'next';
import { IdeasHistory } from '@/components/ideas/ideas-history';

export const metadata: Metadata = {
  title: 'Ideas History | Brainrot Video Generator',
  description: 'View and manage your saved viral story ideas with search, filtering, and organization tools.',
};

export default function IdeasPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <IdeasHistory />
    </div>
  );
} 