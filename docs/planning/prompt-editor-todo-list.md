# Prompt Editor – AI Chat UI & Pipeline

_Tracked on: **2025-07-18**_  
_Updated on: **2025-01-16**_

This document captures the tasks required to ship the first MVP of the chat-driven video-editing experience with inline video previews directly in the chat interface.

## Phase 1 – Conversation & Script Generation  *(LangGraph powered)*

> We will wire the backend agent using **LangGraphJS**.  Keep the [LangGraph Quick-start](../llm.txts/langgraphLLM.txt) open for code snippets.

### Front-end ✅ COMPLETED

- [x] FE Create `PromptChat` component – manages message list & input (React client component)
- [x] FE Create `MessageRenderer` with support for:
  - text messages with typing animations
  - `script_suggestion` cards (select / edit)
  - inline video preview messages
  - real user avatars and modern UI design
- [x] FE Implement clean chat bubble design with purple gradient for user messages
- [x] FE Add typing indicators and smooth animations
- [x] FE Remove scrollbars while maintaining scroll functionality

### Back-end

- [ ] BE `/api/agent` SSE route – spins up **LangGraph** graph and streams each `yield` to the client
- [ ] LangGraph graph nodes:
  1. `generateScripts` (LLM w/ prompt)
  2. `waitForChoice` (interrupt until UI sends `script_chosen`)
- [ ] Tool implementation `generateScripts(topic[], style)` → returns 3 alternatives
- [ ] Add video message type support for inline video previews in chat

Once these check-boxes are complete we'll have end-to-end script generation with live chat updates and inline video previews.

## Phase 2 – Avatar & Voice Selection

- [ ] FE Add video message type to `MessageRenderer` for inline video display
- [ ] FE Integrate `useAvatars` & `useVoices` hooks into chat flow
- [ ] Update agent context with `avatar_selected` & `voice_selected` events
- [ ] FE Show avatar/voice selection as interactive chat cards

## Phase 3 – Timeline Assembly & Inline Preview

- [ ] Agent Tool: `assembleTimeline(script, avatarId, voiceId)` – emits EditJSON
- [ ] BE Generate captions via whisper & align timing
- [ ] FE Render inline video preview in chat using Remotion `<Player>`
- [ ] FE Support video message type with custom controls and download options
- [ ] FE Hot-reload preview on subsequent script edits

## Phase 4 – Stock Media & B-roll (optional in MVP)

- [ ] Agent Tool: `findStockMedia(keywords[])` (Pexels / Unsplash)
- [ ] Insert media layers into EditJSON
- [ ] Show media suggestions as interactive chat cards

## Phase 5 – Render & Delivery

- [ ] FE "Render" CTA within chat; show progress and completion messages
- [ ] BE Invoke existing `/api/render` endpoint; stream status updates to chat
- [ ] FE Display final video inline with download link + push to Assets sidebar on success
- [ ] FE Add sharing options directly in chat interface

## Stretch

- [ ] Persist conversation & edit state to Supabase for resume
- [ ] Versioning & undo of timeline edits via chat commands
- [ ] Voice commands integration for hands-free editing 