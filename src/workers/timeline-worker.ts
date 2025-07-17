import { expose } from 'comlink';
import type { TimelineEvent } from '@/types/timeline';

export interface VisibleParams {
  events: TimelineEvent[];
  currentFrame: number;
}

const api = {
  getVisible({ events, currentFrame }: VisibleParams): TimelineEvent[] {
    return events.filter((e) => currentFrame >= e.start && currentFrame < e.end);
  },
};

export type TimelineWorkerApi = typeof api;

expose(api); 