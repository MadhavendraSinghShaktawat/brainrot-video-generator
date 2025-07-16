import { create, StateCreator } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { Timeline, TimelineEvent } from '@/types/timeline';
import { v4 as uuidv4 } from 'uuid';

interface TimelineState {
  // Timeline data
  timeline: Timeline | null;
  timelineId: string | null;
  timelineTitle: string;
  isDirty: boolean;
  
  // Playback state
  currentFrame: number;
  isPlaying: boolean;
  isMuted: boolean;
  volume: number;
  
  // Editor state
  zoom: number;
  selectedEventId: string | null;
  selectedEventIds: string[];
  clipboardEvents: TimelineEvent[];
  
  // UI state
  isLoading: boolean;
  error: string | null;
  
  // History for undo/redo
  history: Timeline[];
  historyIndex: number;
  maxHistorySize: number;
}

interface TimelineActions {
  // Timeline management
  setTimeline: (timeline: Timeline) => void;
  setTimelineId: (id: string | null) => void;
  setTimelineTitle: (title: string) => void;
  createNewTimeline: (width?: number, height?: number, fps?: number) => void;
  resetTimeline: () => void;
  
  // Playback controls
  setCurrentFrame: (frame: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setIsMuted: (muted: boolean) => void;
  setVolume: (volume: number) => void;
  
  // Event management
  addEvent: (event: Omit<TimelineEvent, 'id'>) => void;
  updateEvent: (eventId: string, updates: Partial<TimelineEvent>, recordHistory?: boolean) => void;
  deleteEvent: (eventId: string) => void;
  deleteEvents: (eventIds: string[]) => void;
  duplicateEvent: (eventId: string) => void;
  
  // Selection
  selectEvent: (eventId: string | null) => void;
  selectEvents: (eventIds: string[]) => void;
  selectAllEvents: () => void;
  clearSelection: () => void;
  
  // Clipboard
  copyEvents: (eventIds: string[]) => void;
  pasteEvents: (targetFrame?: number) => void;
  
  // Timeline manipulation
  moveEvent: (eventId: string, startFrame: number, endFrame: number, recordHistory?: boolean) => void;
  resizeEvent: (eventId: string, startFrame: number, endFrame: number, recordHistory?: boolean) => void;
  changeEventLayer: (eventId: string, layer: number, recordHistory?: boolean) => void;

  // Tracks
  reorderLayers: (fromLayer: number, toLayer: number) => void;
  
  // Editor state
  setZoom: (zoom: number) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // History
  pushToHistory: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  
  // Utility
  getEventById: (eventId: string) => TimelineEvent | null;
  getMaxFrame: () => number;
  getDurationInSeconds: () => number;
  getEventsInRange: (startFrame: number, endFrame: number) => TimelineEvent[];
  getEventsAtFrame: (frame: number) => TimelineEvent[];
}

type TimelineStore = TimelineState & TimelineActions;

const DEFAULT_TIMELINE: Timeline = {
  fps: 30,
  width: 1920,
  height: 1080,
  background: '#000000',
  events: [],
};

const INITIAL_STATE: TimelineState = {
  timeline: null,
  timelineId: null,
  timelineTitle: 'Untitled Timeline',
  isDirty: false,
  currentFrame: 0,
  isPlaying: false,
  isMuted: false,
  volume: 1,
  zoom: 1,
  selectedEventId: null,
  selectedEventIds: [],
  clipboardEvents: [],
  isLoading: false,
  error: null,
  history: [],
  historyIndex: -1,
  maxHistorySize: 50,
};

type MyStoreCreator = StateCreator<
  TimelineStore,
  [['zustand/devtools', never], ['zustand/persist', unknown]],
  []
>;

const storeImpl: MyStoreCreator = (set, get) => ({
  ...INITIAL_STATE,
  
  // Timeline management
  setTimeline: (timeline) => {
    set({ timeline, isDirty: false });
    get().pushToHistory();
  },
  
  setTimelineId: (id) => set({ timelineId: id }),
  
  setTimelineTitle: (title) => set({ timelineTitle: title, isDirty: true }),
  
  createNewTimeline: (width = 1920, height = 1080, fps = 30) => {
    const newTimeline: Timeline = {
      ...DEFAULT_TIMELINE,
      width,
      height,
      fps,
    };
    set({ 
      timeline: newTimeline, 
      timelineId: null, 
      timelineTitle: 'Untitled Timeline',
      isDirty: false,
      currentFrame: 0,
      selectedEventId: null,
      selectedEventIds: [],
      history: [],
      historyIndex: -1,
    });
    get().pushToHistory();
  },
  
  resetTimeline: () => {
    set({
      ...INITIAL_STATE,
      timeline: null,
    });
  },
  
  // Playback controls
  setCurrentFrame: (frame) => {
    const maxFrame = get().getMaxFrame();
    const clampedFrame = Math.max(0, Math.min(frame, maxFrame));
    set({ currentFrame: clampedFrame });
  },
  
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setIsMuted: (muted) => set({ isMuted: muted }),
  setVolume: (volume) => set({ volume: Math.max(0, Math.min(1, volume)) }),
  
  // Event management
  addEvent: (eventData) => {
    const state = get();
    if (!state.timeline) return;
    
    const newEvent = {
      ...eventData,
      id: uuidv4(),
      layer: (eventData as any).layer || 1,
    } as TimelineEvent;
    
    const updatedTimeline = {
      ...state.timeline,
      events: [...state.timeline.events, newEvent],
    } as Timeline;
    
    set({ timeline: updatedTimeline, isDirty: true });
    get().pushToHistory();
  },
  
  updateEvent: (eventId: string, updates: Partial<TimelineEvent>, recordHistory: boolean = true) => {
    const state = get();
    if (!state.timeline) return;
    
    const updatedEvents = state.timeline.events.map(event =>
      event.id === eventId ? { ...event, ...updates } : event
    ) as TimelineEvent[];
    
    const updatedTimeline = {
      ...state.timeline,
      events: updatedEvents,
    } as Timeline;
    
    set({ timeline: updatedTimeline, isDirty: true });
    if (recordHistory) {
      get().pushToHistory();
    }
  },
  
  deleteEvent: (eventId) => {
    const state = get();
    if (!state.timeline) return;
    
    const updatedEvents = state.timeline.events.filter(event => event.id !== eventId);
    const updatedTimeline = {
      ...state.timeline,
      events: updatedEvents,
    } as Timeline;
    
    set({ 
      timeline: updatedTimeline, 
      isDirty: true,
      selectedEventId: state.selectedEventId === eventId ? null : state.selectedEventId,
      selectedEventIds: state.selectedEventIds.filter(id => id !== eventId),
    });
    get().pushToHistory();
  },
  
  deleteEvents: (eventIds) => {
    const state = get();
    if (!state.timeline) return;
    
    const updatedEvents = state.timeline.events.filter(event => !eventIds.includes(event.id));
    const updatedTimeline = {
      ...state.timeline,
      events: updatedEvents,
    } as Timeline;
    
    set({ 
      timeline: updatedTimeline, 
      isDirty: true,
      selectedEventId: eventIds.includes(state.selectedEventId || '') ? null : state.selectedEventId,
      selectedEventIds: state.selectedEventIds.filter(id => !eventIds.includes(id)),
    });
    get().pushToHistory();
  },
  
  duplicateEvent: (eventId) => {
    const state = get();
    if (!state.timeline) return;
    
    const originalEvent = state.timeline.events.find(e => e.id === eventId);
    if (!originalEvent) return;
    
    const duplicatedEvent = {
      ...originalEvent,
      id: uuidv4(),
      start: originalEvent.end,
      end: originalEvent.end + (originalEvent.end - originalEvent.start),
    } as TimelineEvent;
    
    const updatedTimeline = {
      ...state.timeline,
      events: [...state.timeline.events, duplicatedEvent],
    } as Timeline;
    
    set({ timeline: updatedTimeline, isDirty: true });
    get().pushToHistory();
  },
  
  // Selection
  selectEvent: (eventId) => set({ 
    selectedEventId: eventId,
    selectedEventIds: eventId ? [eventId] : [],
  }),
  
  selectEvents: (eventIds) => set({ 
    selectedEventIds: eventIds,
    selectedEventId: eventIds.length === 1 ? eventIds[0] : null,
  }),
  
  selectAllEvents: () => {
    const state = get();
    if (!state.timeline) return;
    
    const allEventIds = state.timeline.events.map(e => e.id);
    set({ 
      selectedEventIds: allEventIds,
      selectedEventId: allEventIds.length === 1 ? allEventIds[0] : null,
    });
  },
  
  clearSelection: () => set({ 
    selectedEventId: null,
    selectedEventIds: [],
  }),
  
  // Clipboard
  copyEvents: (eventIds) => {
    const state = get();
    if (!state.timeline) return;
    
    const eventsToCopy = state.timeline.events.filter(e => eventIds.includes(e.id));
    set({ clipboardEvents: eventsToCopy });
  },
  
  pasteEvents: (targetFrame = 0) => {
    const state = get();
    if (!state.timeline || state.clipboardEvents.length === 0) return;
    
    const earliestFrame = Math.min(...state.clipboardEvents.map(e => e.start));
    const offset = targetFrame - earliestFrame;
    
    const pastedEvents = state.clipboardEvents.map(event => ({
      ...event,
      id: uuidv4(),
      start: event.start + offset,
      end: event.end + offset,
    }));
    
    const updatedTimeline = {
      ...state.timeline,
      events: [...state.timeline.events, ...pastedEvents] as TimelineEvent[],
    } as Timeline;
    
    set({ timeline: updatedTimeline, isDirty: true });
    get().pushToHistory();
  },
  
  // Timeline manipulation
  moveEvent: (eventId, startFrame, endFrame, recordHistory: boolean = false) => {
    get().updateEvent(eventId, { start: startFrame, end: endFrame }, recordHistory);
  },
  
  resizeEvent: (eventId, startFrame, endFrame, recordHistory: boolean = false) => {
    get().updateEvent(eventId, { start: startFrame, end: endFrame }, recordHistory);
  },
  
  changeEventLayer: (eventId, layer, recordHistory = true) => {
    const state = get();
    if (!state.timeline) return;

    const updatedEvents = state.timeline.events.map((event) => {
      if (event.id === eventId) {
        return { ...event, layer };
      }
      return event;
    });

    const updatedTimeline = {
      ...state.timeline,
      events: updatedEvents,
    } as Timeline;

    set({ timeline: updatedTimeline, isDirty: true });
    get().pushToHistory();
  },

  // ======= Reorder whole layers =======
  reorderLayers: (fromLayer, toLayer) => {
    const state = get();
    if (!state.timeline) return;

    if (fromLayer === toLayer) return;

    const updatedEvents = state.timeline.events.map((event) => {
      const layerVal = event.layer ?? 1;
      if (layerVal === fromLayer) return { ...event, layer: toLayer };
      if (fromLayer < toLayer) {
        if (layerVal > fromLayer && layerVal <= toLayer) {
          return { ...event, layer: layerVal - 1 };
        }
      } else {
        if (layerVal >= toLayer && layerVal < fromLayer) {
          return { ...event, layer: layerVal + 1 };
        }
      }
      return event;
    });

    const updatedTimeline = {
      ...state.timeline,
      events: updatedEvents,
    } as Timeline;

    if (typeof window !== 'undefined') {
      (window as any).__lastLayerSwap = { from: fromLayer, to: toLayer, timestamp: Date.now() };
    }

    set({ timeline: updatedTimeline, isDirty: true });
    get().pushToHistory();
  },
  
  // Editor state
  setZoom: (zoom) => set({ zoom: Math.max(0.1, Math.min(10, zoom)) }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  
  // History
  pushToHistory: () => {
    const state = get();
    if (!state.timeline) return;
    
    const newHistory = state.history.slice(0, state.historyIndex + 1);
    // structuredClone is much faster and preserves Dates / maps etc.
    newHistory.push(structuredClone(state.timeline));
    
    // Limit history size
    if (newHistory.length > state.maxHistorySize) {
      newHistory.shift();
    }
    
    set({ 
      history: newHistory,
      historyIndex: newHistory.length - 1,
    });
  },
  
  undo: () => {
    const state = get();
    if (state.historyIndex > 0) {
      const prevTimeline = state.history[state.historyIndex - 1];
      set({ 
        timeline: prevTimeline,
        historyIndex: state.historyIndex - 1,
        isDirty: true,
      });
    }
  },
  
  redo: () => {
    const state = get();
    if (state.historyIndex < state.history.length - 1) {
      const nextTimeline = state.history[state.historyIndex + 1];
      set({ 
        timeline: nextTimeline,
        historyIndex: state.historyIndex + 1,
        isDirty: true,
      });
    }
  },
  
  canUndo: () => get().historyIndex > 0,
  canRedo: () => get().historyIndex < get().history.length - 1,
  
  // Utility
  getEventById: (eventId) => {
    const state = get();
    return state.timeline?.events.find(e => e.id === eventId) || null;
  },
  
  getMaxFrame: () => {
    const state = get();
    if (!state.timeline || state.timeline.events.length === 0) return 300; // Default 10 seconds
    return Math.max(...state.timeline.events.map(e => e.end));
  },
  
  getDurationInSeconds: () => {
    const state = get();
    if (!state.timeline) return 0;
    return Math.round(get().getMaxFrame() / state.timeline.fps);
  },
  
  getEventsInRange: (startFrame, endFrame) => {
    const state = get();
    if (!state.timeline) return [];
    
    return state.timeline.events.filter(event => 
      event.start < endFrame && event.end > startFrame
    );
  },
  
  getEventsAtFrame: (frame) => {
    const state = get();
    if (!state.timeline) return [];
    
    return state.timeline.events.filter(event => 
      event.start <= frame && event.end > frame
    );
  },
});

export const useTimelineStore = create<TimelineStore>()(
  persist(
    devtools(storeImpl, { name: 'timeline-devtools' }),
    {
      name: 'timeline-storage',
      partialize: (state: TimelineStore) => ({
        timeline: state.timeline,
        timelineTitle: state.timelineTitle,
      }),
      version: 1,
    }
  )
); 