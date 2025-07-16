export const getTimelineDuration = (timeline: { events: { end: number }[] }): number => {
  if (!timeline.events || timeline.events.length === 0) return 0;
  return Math.max(...timeline.events.map((e) => e.end));
}; 