# LangGraph Avatar & Voice Integration TODO

_Created on: **2025-01-16**_  
_Last Updated: **2025-01-19**_

This document outlines the tasks to integrate LangGraph intelligent chat with the existing HeyGen avatar/voice infrastructure, creating a seamless conversational experience for video generation.

## Phase 1 – LangGraph Tool Integration *(Backend)* ✅ COMPLETED

### Avatar & Voice Discovery Tools
- [x] **Avatar List Tool** – `@tool list_avatars()` wrapper around `/api/avatar/templates`
- [x] **Voice List Tool** – `@tool list_voices()` wrapper around `/api/avatar/voices`  
- [x] **Voice Preview Tool** – Integrated into VoiceSelector component with audio controls
- [x] **Tool Response Formatting** – Format API responses for LangGraph consumption
- [x] **Error Handling** – Graceful fallbacks when HeyGen APIs are unavailable

### Video Generation Tools
- [x] **Avatar Generation Tool** – `@tool generate_avatar_video(script, avatar_id, voice_id)` 
- [x] **Status Check Tool** – `@tool check_generation_status(job_id)` wrapper around `/api/avatar/status`
- [x] **Job Management** – Handle job creation and tracking through existing infrastructure
- [ ] **Async Status Updates** – Integration with existing Inngest poller for real-time updates

### Agent Intelligence
- [x] **Intent Recognition** – Detect avatar/voice requests in user messages
- [ ] **Context Management** – Remember selected avatars/voices across conversation
- [x] **Smart Suggestions** – Basic recommendations based on script content
- [ ] **Multi-step Workflows** – Guide users through avatar → voice → script → generation flow

## Phase 2 – Chat Message Types *(Frontend)* ✅ COMPLETED

### New Message Types
- [x] **avatar_gallery** – Interactive scrollable grid with lazy loading (12→100 avatars)
- [x] **voice_selector** – Scrollable list with lazy loading and audio preview (8→50 voices)
- [x] **generation_progress** – Real-time progress tracking with status updates
- [x] **avatar_video_result** – Embedded video player with download/share actions

### Message Renderer Components
- [x] **AvatarGallery Component** – Responsive grid with selection state, lazy loading, thinking states
- [x] **VoiceSelector Component** – List with play buttons, CORS handling, error recovery
- [x] **GenerationProgress Component** – Progress bar with status messages
- [x] **VideoResult Component** – Video player with custom controls and actions
- [x] **Interactive State Management** – Handle user selections and pass to agent

### UI/UX Enhancements
- [x] **Loading States** – Thinking indicators ("🤔 Let me check...") before content loads
- [x] **Error States** – Graceful error handling with retry options and user-friendly messages
- [x] **Mobile Responsive** – Touch-friendly interfaces with scrollable containers
- [x] **Accessibility** – Screen reader support and keyboard navigation
- [x] **Performance Optimization** – Fixed JSON truncation, duplicate key errors, loading state timing

## Phase 3 – Agent Route Updates *(API Integration)* ✅ COMPLETED

### Enhanced SSE Agent
- [x] **Tool Registration** – Enhanced LangGraph tools with structured responses and Zod schemas
- [x] **Intent Routing** – Intelligent pattern-based intent recognition with entity extraction
- [x] **Streaming Responses** – Structured responses with metadata, rate limit info, and error handling
- [x] **Context Persistence** – User context storage with localStorage integration for selections
- [x] **Rate Limiting** – Sliding window rate limiting (10 avatars/min, 5 videos/5min, 30 status/min)

### Real-time Updates
- [ ] **WebSocket Integration** – Real-time status updates for generation jobs
- [ ] **Progress Streaming** – Stream generation progress to chat interface
- [ ] **Completion Notifications** – Notify when videos are ready
- [ ] **Error Broadcasting** – Broadcast generation errors to chat

## Phase 4 – User Experience Flow *(Integration)*

### Conversation Workflows
- [x] **Discovery Flow** – "What avatars do we have?" → gallery display with lazy loading
- [x] **Preview Flow** – "Can I hear this voice?" → audio preview with error handling
- [ ] **Generation Flow** – Script + selections → progress → result
- [ ] **Retry Flow** – Failed generations → error handling → retry options

### Smart Suggestions
- [ ] **Content-Based Recommendations** – Suggest avatars based on script tone
- [ ] **Voice Matching** – Recommend voices that match selected avatars
- [ ] **Recent Selections** – Remember user preferences across sessions
- [ ] **Popular Choices** – Highlight commonly used avatars/voices

### Performance Optimizations
- [x] **Caching Strategy** – Limited avatar/voice payloads to prevent truncation
- [x] **Lazy Loading** – Load thumbnails and previews on demand with smooth scrolling
- [x] **Debounced Requests** – Prevent rapid-fire API calls during scroll
- [ ] **Background Prefetching** – Preload common assets

## Phase 5 – Testing & Polish

### Integration Testing
- [ ] **End-to-End Workflows** – Test complete avatar selection → generation flow
- [x] **Error Scenarios** – Fixed JSON truncation, duplicate keys, loading state bugs
- [x] **Performance Testing** – Optimized for smooth UX with large datasets
- [x] **Cross-Browser Testing** – Audio/video compatibility with CORS fallbacks

### User Testing
- [ ] **Usability Testing** – Test with real users for UX feedback
- [x] **Accessibility Testing** – Screen readers, keyboard navigation implemented
- [x] **Mobile Testing** – Touch interactions and responsive design working
- [x] **Voice Preview Testing** – Audio playback with error recovery across devices

### Documentation
- [ ] **User Guide** – How to use avatar/voice features in chat
- [ ] **Developer Docs** – Tool integration and message type documentation
- [ ] **Troubleshooting** – Common issues and solutions
- [ ] **API Reference** – Tool function signatures and responses

## Recent Fixes & Improvements *(Jan 19, 2025)*

### 🐛 Bug Fixes *(Phase 2)*
- [x] **Duplicate Key Errors** – Fixed avatar/voice duplication in lazy loading
- [x] **JSON Truncation** – Limited payloads to prevent 65KB SSE errors  
- [x] **Loading State Timing** – Fixed loading indicators appearing after content
- [x] **AI Assistant Disappearing** – Removed setTimeout delays causing UI flicker

### 🎨 UX Enhancements *(Phase 2)*
- [x] **Thinking States** – Added "🤔 Let me check..." before avatar/voice loading
- [x] **Scrollable Containers** – Fixed-height containers with smooth scrolling
- [x] **Voice Playback** – Improved audio handling with CORS fallbacks and timeouts
- [x] **Progress Indicators** – Shows "X of Y loaded" with accurate counts

### 🚀 Phase 3 Enhancements *(Agent Integration)*
- [x] **Enhanced LangGraph Tools** – Structured responses with proper Zod schemas and error handling
- [x] **Intelligent Intent Recognition** – Pattern-based routing with entity extraction for complex requests
- [x] **Context Persistence** – User sessions remember avatar/voice selections across conversations
- [x] **Rate Limiting** – Sliding window protection (10 avatar requests/min, 5 video generations/5min)
- [x] **Improved Error Handling** – Detailed error responses with success flags and metadata
- [x] **Direct Provider Integration** – Tools use avatar providers directly instead of internal API calls

## Stretch Goals

### Advanced Features
- [ ] **Voice Cloning Integration** – Connect with custom voice upload system
- [ ] **Avatar Customization** – Clothing, background, pose options
- [ ] **Batch Generation** – Generate multiple videos with different avatars/voices
- [ ] **Template Library** – Save favorite avatar/voice combinations

### Analytics & Optimization
- [ ] **Usage Analytics** – Track popular avatars, voices, and generation patterns
- [ ] **Performance Metrics** – Monitor generation times and success rates
- [ ] **User Preferences** – Learn from user selections to improve suggestions
- [ ] **A/B Testing** – Test different UX flows for optimal conversion

## Dependencies

- **Existing Infrastructure**: HeyGen Provider, Avatar Jobs Table, Assets Table
- **Frontend Framework**: React with existing chat components  
- **Backend Services**: Existing `/api/avatar/*` endpoints
- **Real-time Updates**: Inngest poller and potential WebSocket integration

## Success Criteria

✅ **Seamless Discovery** – Users can easily browse and preview avatars/voices  
🚧 **Intuitive Generation** – Natural conversation flow from selection to video  
🚧 **Real-time Feedback** – Live updates on generation progress and completion  
✅ **Error Recovery** – Graceful handling of failures with clear next steps  
✅ **Performance** – Fast loading, smooth interactions, efficient API usage 