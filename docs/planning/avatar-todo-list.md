# Avatar Integration TODO List

> Last updated: <!-- TODO: update date when editing -->

A staged checklist to integrate a pluggable AI-avatar rendering service (starting with HeyGen, switchable later).

## Phase 1 – Core Infrastructure

- [ ] **Interfaces & Types** – Define `AvatarRequest`, `AvatarJob`, and `AvatarProvider` in `src/types/avatar.ts`.
- [ ] **Provider Driver (HeyGen)** – Implement `HeyGenProvider` in `src/services/avatar-providers/heygen.ts`.
- [ ] **Database Schema** – Add Supabase migration for the `avatar_jobs` table and index.

## Phase 2 – API Layer

- [ ] **Render Endpoint** – POST `/api/avatar/render`: submit job via provider, write DB row, return job id.
- [ ] **Status Endpoint** – GET `/api/avatar/status?id=<uuid>`: return job status; poll provider if stale.
- [ ] **Webhook Endpoint** – POST `/api/avatar/webhook`: receive provider callbacks, update DB row, push realtime event.
- [ ] **Background Poller** – Cron Inngest function polling job status for providers without webhooks.

## Phase 3 – Front-end Integration

- [ ] **React Hooks** – `useAvatarRender` and `useAvatarStatus` using React Query.
- [ ] **Timeline Integration** – Auto-insert finished avatar clip into current timeline layer once `outputUrl` is available.
- [ ] **Env & Docs** – Add `AVATAR_PROVIDER` env variable, provider secret keys, and update README / .env.example.

---

### Stretch Goals

- [ ] Capability matrix endpoint (`/api/avatar/info`) to surface provider-specific features in the UI.
- [ ] Multi-provider fallback (try HeyGen, then a2e.ai if quota exceeded).
- [ ] Self-hosted pipeline driver (AnimateDiff + Wav2Lip) for on-prem deployments. 