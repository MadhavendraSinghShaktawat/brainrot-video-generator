# Development TODO – Crystal-Clear Steps

> Follow the checklist in order. Each task is atomic and verifiable. Check it off only when **merged to main** and passing CI.

---

## 0. Repo & Environment  
- [ ] 0.1 **Create `.env.example`** with SUPABASE keys, OPENAI key, RUNPOD token. `[DEVOPS]`  
- [ ] 0.2 **ESLint + Prettier config** extended from `eslint-config-next`. `[DEVOPS]`  
- [ ] 0.3 **GitHub Actions**: `ci.yml` (lint, type-check, unit tests), `preview.yml` (deploy to Vercel preview). `[DEVOPS]`  

## 1. Data Layer  
- [x] 1.1 Design `TimelineEvent` & `Timeline` TypeScript interfaces. `[BE]`  
- [x] 1.2 Create matching **Zod schema** `timelineSchema`. `[BE]`  
- [x] 1.3 Supabase SQL migration: `timelines` table (`id`, `jsonb`, `title`, `user_id`, `created_at`). `[BE]`  
- [x] 1.4 `src/lib/db.ts` helper – Supabase typed client. `[BE]`  

## 2. Upload & Asset Management  
- [x] 2.0 **Create GCS bucket** (`brainrot-assets-ubkxluzh`) in `us-central1`. `[DEVOPS]`  
- [x] 2.1 **Add lifecycle rule** – auto-delete tmp uploads after 30 days. `[DEVOPS]`  
- [x] 2.2 **Service account** (`asset-uploader`) permissions. `[DEVOPS]`  
- [x] 2.3 `/api/upload` – signed URL (PUT). `[BE]`  
- [x] 2.4 UI **Drop-zone** uploads & records metadata (thumbnails + hover preview). `[FE]`  
- [x] 2.5 CLI `scripts/ingest-assets.ts` – bulk uploads. `[BE]`  

## 3. Rendering Pipeline MVP  
- [x] 3.1 `JsonDrivenVideo` Remotion component. `[FE]`  
- [x] 3.2 Bundle script: `scripts/bundle.ts`. `[BE]`  
- [x] 3.3 Render worker script. `[BE]`  
- [x] 3.4 Dockerfile for worker. `[DEVOPS]`  
- [ ] 3.5 RunPod serverless test. `[DEVOPS]`  

## 4. Render Queue API  
- [x] 4.1 Supabase table `render_jobs`. `[BE]`  
- [x] 4.2 `POST /api/render` route. `[BE]`  
- [x] 4.3 Worker polling & mp4 upload. `[BE]`  
- [ ] 4.4 `useRenderStatus` polling hook. `[FE]`  

## 5. Timeline Management & JSON Editor  
- [x] 5.0 Timeline CRUD API endpoints. `[BE]`  
  - [x] 5.0.1 `POST /api/timelines` - Create timeline. `[BE]`  
  - [x] 5.0.2 `GET /api/timelines/[id]` - Load timeline. `[BE]`  
  - [x] 5.0.3 `PUT /api/timelines/[id]` - Update timeline. `[BE]`  
  - [x] 5.0.4 `GET /api/timelines` - List user timelines. `[BE]`  
- [x] 5.0.5 Timeline listing page `/timelines`. `[FE]`  
- [x] 5.1 Route `/timelines/[id]/edit-json`. `[FE]`  
- [x] 5.2 Monaco editor integration. `[FE]`  
- [x] 5.3 Save button w/ validation. `[FE]`  
- [x] 5.3.1 Connect save button to API. `[FE]`  
- [x] 5.4 `<Player>` live preview. `[FE]`  
- [x] 5.5 Load existing timeline data. `[FE]`  
- [x] 5.6 Timeline preview page `/timelines/[id]/preview`. `[FE]`  

## 6. Timeline UI Prototype  
- [x] 6.1 `timelineStore` (zustand). `[FE]`  
- [x] 6.2 Ruler + zoom. `[FE]`  
- [x] 6.3 Drag/resize Clip component. `[FE]`  
- [ ] 6.4 Playhead sync. `[FE]`  
- [ ] 6.5 Export JSON (download/copy). `[FE]`  
- [ ] 6.6 Save timeline to database. `[FE]`  
- [ ] 6.7 Navigate to JSON editor after save. `[FE]`  

## 7. Properties Sidebar  
- [ ] 7.1 Transform panel. `[FE]`  
- [ ] 7.2 Trim fields. `[FE]`  
- [ ] 7.3 Two-way binding. `[FE]`  

## 8. AI EDL Generator  
- [ ] 8.1 `/api/generate-edl` – OpenAI call. `[BE]`  
- [ ] 8.2 Wizard UI. `[FE]`  

## 9. Testing & QA  
- [x] 9.0 Timeline system test page `/test-timeline`. `[FE]`  
- [ ] 9.1 Unit tests. `[DEVOPS]`  
- [ ] 9.2 Integration render test. `[DEVOPS]`  
- [ ] 9.3 Cypress end-to-end flow. `[DEVOPS]`  

## 10. Polishing  
- [ ] 10.1 Theming. `[FE]`  
- [ ] 10.2 Undo/redo history. `[FE]`  
- [ ] 10.3 Keyboard shortcuts. `[FE]`  
- [ ] 10.4 Accessibility pass. `[FE]` 

## 11. Performance & Preview Optimisation  
- [ ] 11.1 **Down-sample preview resolution** – Render the player at 360-480 p and scale with CSS. `[FE]`  
- [ ] 11.2 **Quality toggle** – UI switch (Low / High / Original) for preview resolution. `[FE]`  
- [ ] 11.3 **Throttle preview FPS** – Limit `<Player>` to 15 fps while scrubbing; full fps only on play. `[FE]`  
- [ ] 11.4 **Virtualise timeline list** – Use `react-window` so only visible clips render. `[FE]`  
- [ ] 11.5 **Memoise Clip & Track components** – `React.memo`, stable callbacks via `useCallback`. `[FE]`  
- [ ] 11.6 **Server-side thumbnails** – Generate 320 px JPGs with FFmpeg in a worker; store in Supabase. `[BE]`  
- [ ] 11.7 **Lazy-load heavy libs** – Dynamic import Monaco editor, large icon packs. `[FE]`  
- [ ] 11.8 **Bundle analysis & splitting** – Run `next build --profile` and introduce code-splitting for PromptPanel, AI code. `[DEVOPS]`  
- [ ] 11.9 **Cache asset queries** – Wrap `/api/assets` calls with SWR/React Query and CDN headers. `[BE]`  
- [ ] 11.10 **GPU-friendly video formats** – Offer HLS 360 p proxies for sidebar previews. `[BE]`  
- [ ] 11.11 **Measure & profile** – Add React Profiler and Chrome performance budget, document findings. `[DEVOPS]` 