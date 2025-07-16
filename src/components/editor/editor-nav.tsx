import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTimelineStore } from '@/store/timeline-store';
import { Plus, FolderOpen, ChevronDown, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';

const API_BASE = '/api/timelines';

const EditorNav: React.FC = () => {
  const router = useRouter();
  const search = useSearchParams();
  const timelineId = search.get('id');

  const { timelineTitle, setTimelineTitle, timeline } = useTimelineStore();

  const [editTitle, setEditTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(timelineTitle);

  // Keep local input in sync with global title (e.g. after loading project)
  React.useEffect(() => {
    setTitleInput(timelineTitle);
  }, [timelineTitle]);

  const handleCreateProject = async () => {
    const name = prompt('Project name');
    if (!name) return;

    const emptyTimeline = {
      width: 1920,
      height: 1080,
      fps: 30,
      events: [],
    };

    const res = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: name, data: emptyTimeline }),
    });
    if (res.ok) {
      const data = await res.json();
      router.push(`/editor?id=${data.id}`);
    } else {
      alert('Failed to create project');
    }
  };

  const handleOpenProject = () => {
    router.push('/timelines'); // simple list page
  };

  const saveTitle = async () => {
    if (!timelineId) return;
    await fetch(`${API_BASE}/${timelineId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: titleInput, data: timeline }),
    });
    setTimelineTitle(titleInput);
  };

  return (
    <nav className="flex items-center justify-between px-4 py-2 bg-gray-900 text-white select-none">
      <div className="font-semibold text-sm">Video Studio</div>

      {/* Project title */}
      <div className="flex items-center gap-2">
        {editTitle ? (
          <input
            value={titleInput}
            onChange={(e) => setTitleInput(e.target.value)}
            onBlur={() => {
              setEditTitle(false);
              saveTitle();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                (e.target as HTMLInputElement).blur();
              }
            }}
            className="bg-transparent border-b border-white/50 focus:outline-none text-sm"
            autoFocus
          />
        ) : (
          <span className="text-sm font-medium" onDoubleClick={() => setEditTitle(true)}>
            {timelineTitle || 'Untitled Project'}
          </span>
        )}
        <Pencil size={14} className="opacity-50 cursor-pointer" onClick={() => setEditTitle(true)} />
      </div>

      {/* File menu */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" className="flex items-center gap-1" onClick={handleCreateProject}>
          <Plus size={14} /> New
        </Button>
        <Button variant="outline" size="sm" className="flex items-center gap-1" onClick={handleOpenProject}>
          <FolderOpen size={14} /> Open
        </Button>
      </div>
    </nav>
  );
};

export default EditorNav; 