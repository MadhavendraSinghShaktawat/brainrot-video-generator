import { TimelineAction } from '@/ai/actions';
import { useTimelineStore } from '@/store/timeline-store';
import { TimelineEvent } from '@/types/timeline';

// Centralised executor that mutates the timeline based on an AI action.
export async function applyAction(action: TimelineAction) {
  const store = useTimelineStore.getState();
  const { timeline } = store;
  if (!timeline) return;

  const fps = timeline.fps ?? 30;

  const secToFrame = (sec: number) => Math.round(sec * fps);

  switch (action.type) {
    case 'trim': {
      const target = firstEventOnLayer(action.layer);
      if (!target) return;
      store.resizeEvent(
        target.id,
        secToFrame(action.fromSec),
        secToFrame(action.toSec),
        false
      );
      break;
    }
    case 'addAsset': {
      // Very simple asset finder: look for first asset whose url or name includes the query
      // Replace with a Supabase search if desired.
      const assets = (window as any).currentAssets as { id: string; url: string; name?: string; type: string; duration?: number }[] | undefined;

      const typeMatches = (assetType: string, kind: string) => {
        if (assetType === kind) return true;
        // treat "image" and "photo" as synonyms
        if ((assetType === 'photo' && kind === 'image') || (assetType === 'image' && kind === 'photo')) return true;
        return false;
      };

      const asset = assets?.find(
        (a) => typeMatches(a.type, action.assetKind) && a.name?.toLowerCase().includes(action.query.toLowerCase()),
      );
      if (!asset) {
        console.warn('Asset not found for query', action.query);
        return;
      }

      const durationFrames = secToFrame(asset.duration ?? 3); // default 3 s if unknown

      const desiredLayer = action.layer;

      // Helper to determine if two events overlap in time (inclusive start, exclusive end)
      const overlaps = (aStart: number, aEnd: number, bStart: number, bEnd: number) =>
        aStart < bEnd && bStart < aEnd;

      // Find the lowest layer that does NOT overlap with existing events in that time range.
      const usedLayers = new Set<number>();
      timeline.events.forEach((evt) => {
        if (overlaps(secToFrame(action.atSec), secToFrame(action.atSec) + durationFrames, evt.start, evt.end)) {
          usedLayers.add(evt.layer ?? 0);
        }
      });

      let finalLayer = desiredLayer;
      if (usedLayers.has(desiredLayer)) {
        // look upward for the first free layer
        finalLayer = desiredLayer;
        while (usedLayers.has(finalLayer)) {
          finalLayer += 1;
        }
      }

      const newEvent: Omit<TimelineEvent, 'id'> = {
        type: action.assetKind === 'audio' ? 'audio' : (asset.type === 'photo' ? 'image' : asset.type) as any,
        src: asset.url,
        layer: finalLayer,
        start: secToFrame(action.atSec),
        end: secToFrame(action.atSec) + durationFrames,
      } as any;
      store.addEvent(newEvent);
      break;
    }
    case 'move': {
      const evt = store.getEventById(action.id);
      if (evt) {
        const newStart = secToFrame(action.toSec);
        const duration = evt.end - evt.start;
        store.moveEvent(action.id, newStart, newStart + duration, false);
      }
      break;
    }
    case 'layer': {
      store.changeEventLayer(action.id, action.layer, false);
      break;
    }
    case 'transform': {
      store.updateEvent(action.id, {
        xPct: action.xPct,
        yPct: action.yPct,
        scale: action.scale,
      }, false);
      break;
    }
    case 'addCaption': {
      const startF = secToFrame(action.atSec);
      const endF = secToFrame(action.atSec + action.duration);

      const overlaps = (aStart: number, aEnd: number, bStart: number, bEnd: number) =>
        aStart < bEnd && bStart < aEnd;

      // Choose the lowest free layer starting from the suggested one
      let finalLayer = action.layer;
      let conflict = true;
      while (conflict) {
        conflict = timeline.events.some(
          (evt) => evt.layer === finalLayer && overlaps(evt.start, evt.end, startF, endF),
        );
        if (conflict) finalLayer += 1;
      }

      const newEvent: Omit<TimelineEvent, 'id'> = {
        type: 'caption',
        text: action.text,
        layer: finalLayer,
        start: startF,
        end: endF,
      } as any;
      store.addEvent(newEvent);
      break;
    }
    case 'autoCaption': {
      // Prefer audio on specified layer, else fall back to the first audio clip in the timeline
      let audioEvt = timeline.events.find((e) => e.layer === action.layer && e.type === 'audio');
      if (!audioEvt) {
        audioEvt = timeline.events.find((e) => e.type === 'audio') as any;
      }
      if (!audioEvt) {
        console.warn('No audio event found – autoCaption aborted');
        break;
      }

      const baseLayer = (audioEvt.layer ?? 0) + 1;

      try {
        // Fetch audio file to blob
        const audioRes = await fetch((audioEvt as any).src);
        const audioBlob = await audioRes.blob();
        // Derive a safe extension for the temporary file
        let fileExt: string | undefined;
        // 1) From MIME type if available (e.g. audio/mpeg → mpeg or mp3)
        if (audioBlob.type) {
          const fromMime = audioBlob.type.split('/').pop();
          if (fromMime && fromMime.length <= 5) {
            fileExt = fromMime;
          }
        }
        // 2) Fallback: parse from URL (strip query params & other junk)
        if (!fileExt) {
          const srcUrl = (audioEvt as any).src as string;
          const cleanPath = srcUrl.split('?')[0];
          fileExt = (cleanPath.split('.').pop() || 'mp3').split('&')[0];
        }
        // Final sanitise – allow only alphanumerics
        fileExt = (fileExt || 'mp3').replace(/[^a-zA-Z0-9]/g, '') || 'mp3';

        const audioFile = new File([audioBlob], `audio.${fileExt}`, { type: audioBlob.type || 'audio/mpeg' });

        const form = new FormData();
        form.append('file', audioFile);

        const resp = await fetch('/api/generate-srt', { method: 'POST', body: form });
        if (!resp.ok) {
          console.error('Whisper transcription failed');
          break;
        }
        const json = await resp.json();
        const captions: { text: string; startMs: number; endMs: number }[] = json.captions;

        // Helper to determine overlap
        const overlaps = (aStart: number, aEnd: number, bStart: number, bEnd: number) =>
          aStart < bEnd && bStart < aEnd;

        captions.forEach((cap) => {
          const startF = secToFrame(cap.startMs / 1000);
          const endF = secToFrame(cap.endMs / 1000);

          // Find the first free layer for this caption segment
          let finalLayer = baseLayer;
          let conflict = true;
          while (conflict) {
            conflict = timeline.events.some(
              (evt) => evt.layer === finalLayer && overlaps(evt.start, evt.end, startF, endF),
            );
            if (conflict) finalLayer += 1;
          }

          const evt: Omit<TimelineEvent, 'id'> = {
            type: 'caption',
            text: cap.text,
            layer: finalLayer,
            start: startF,
            end: endF,
          } as any;
          store.addEvent(evt);
        });
      } catch (err) {
        console.error('autoCaption failed', err);
      }
      break;
    }
    default:
      return;
  }
  // mark dirty so autosave triggers
  useTimelineStore.setState({ isDirty: true });

  // helper to find first event on layer (omits audio by default?)
  function firstEventOnLayer(layerUI: number) {
    const { timeline } = useTimelineStore.getState();
    return timeline?.events.find(e => e.layer === layerUI);
  }
} 