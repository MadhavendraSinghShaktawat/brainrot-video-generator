# Performance Optimisation TODO

> Roadmap to make the editor smooth on low-end hardware. Follow the order – each task unblocks the next.

## 1. Proxy Video Workflow  `[BE]` `[FE]`
- [x] 1.1 Transcode uploaded videos to 360 p H.264 proxy using a Runpod / Cloud Run worker.
- [x] 1.2 Store proxy URL (`preview_url`) in Supabase `assets` table.
- [x] 1.3 Return `previewUrl` from `/api/assets` and use it in the editor.
- [x] 1.4 Fallback to original if proxy missing.
- [x] 1.5 CLI script to back-fill proxies for existing assets.

## 2. Virtualised Timeline List  `[FE]`
- [x] 2.1 Replace current `map()` rendering with `react-window`.
- [x] 2.2 Memoise Clip component, add overscan rows.

## 3. Worker Off-load  `[FE]`
- [x] 3.1 Move `visibleEvents` + collision math to Web Worker (Comlink).
- [x] 3.2 Use `Comlink` for thread messaging (set up, load worker in timeline component).

## 4. Single-Canvas Compositing  `[FE]`
- [x] 4.1 Prototype WebGL compositing of visible layers.
- [x] 4.2 Replace per-item DOM nodes with draw calls.
- [x] 4.3 Draw grid & playhead on one `<canvas>` overlay.
- [x] 4.4 Implement transform-based horizontal panning (CSS translateX) for kinetic scroll.

## 5. Server-side Thumbnails & Waveforms  `[BE]`
- [ ] 5.1 FFmpeg grab 0.5 s thumbnail / waveform PNG on upload.
- [ ] 5.2 Remove client-side canvas thumbnail generation.

## 6. Adaptive Preview Polishing  `[FE]`
- [ ] 6.1 Auto drop FPS when tab hidden or CPU > 80 %.
- [ ] 6.2 Battery-saver detection (Navigator API). 