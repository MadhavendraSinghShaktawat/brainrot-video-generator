# MVP Intelligent Video Agent - TODO List

_Created on: **2025-01-19**_  
_Focus: Essential features only for MVP launch_

This document outlines the **minimum viable product** implementation for the intelligent AI video agent. Focus on core functionality to get users creating videos quickly.

## 🎯 MVP Core Features

**Goal:** User says "Generate a video about startup tips for TikTok" → Gets a complete video in 5 minutes

### Essential User Journey:
1. **User Input** → "Create video about [topic] for [platform]"
2. **AI Script Generation** → Generate 3 script options
3. **Script Iteration** → User picks one or requests changes
4. **Avatar Selection** → Show relevant avatars, user picks one
5. **Voice Selection** → Show relevant voices, user picks one  
6. **Video Generation** → Create video with avatar + voice + simple b-roll
7. **Delivery** → User gets downloadable video

---

## Phase 1 – MVP Chat System *(Week 1)*

### Simple Chat Storage
- [ ] **Deploy Simple Chat Schema** – Use `011_mvp_simple_chat_system.sql`
- [ ] **Basic Conversation API** – Create/get conversations
- [ ] **Simple Message API** – Send/receive messages with basic types
- [ ] **Context Persistence** – Remember avatar/voice/platform selections

### Essential Message Types
- [ ] **text** – Basic chat messages
- [ ] **script_options** – Display 3 script variations
- [ ] **avatar_gallery** – Show avatar selection grid
- [ ] **voice_selector** – Show voice options with preview
- [ ] **video_preview** – Show generated video result

---

## Phase 2 – GPT-4.0 Agent Core *(Week 1)*

### Basic AI Agent
- [ ] **Upgrade to GPT-4.0** – Replace current agent 
- [ ] **Intent Recognition** – Detect video creation requests
- [ ] **Context Tracking** – Remember conversation state
- [ ] **Script Generation** – Generate 3 script options for any topic/platform

### Core Tools Integration
- [ ] **Script Generator Tool** – Use existing script generator with GPT-4.0
- [ ] **Avatar List Tool** – Use existing avatar tools
- [ ] **Voice List Tool** – Use existing voice tools  
- [ ] **Video Generation Tool** – Use existing HeyGen integration

---

## Phase 3 – Essential Script Features *(Week 1)*

### Script Generation
- [ ] **Multiple Options** – Generate 3 different script variations
- [ ] **Platform Optimization** – Adjust for Instagram/TikTok/YouTube lengths
- [ ] **Basic Script Rules** – Apply simple hook + CTA patterns
- [ ] **Script Iteration** – Apply user feedback ("make it shorter", "more dramatic")

### Script Rules (Simplified)
- [ ] **Hook Formulas** – Question hooks, shocking statements, contradictions
- [ ] **Platform Length** – TikTok (40-150 words), Instagram (75-180 words)
- [ ] **CTA Integration** – Basic engagement CTAs
- [ ] **TTS Optimization** – No stage directions, natural speech

---

## Phase 4 – Basic Stock Footage *(Week 2)*

### Free Stock APIs (Essential Only)
- [ ] **Pexels API Integration** – Primary stock video source
- [ ] **Basic Asset Matching** – Extract keywords from script, find relevant videos
- [ ] **Simple Download** – Download and store relevant stock footage
- [ ] **Asset Selection** – Let AI pick most relevant assets automatically

### Basic B-Roll Integration  
- [ ] **Keyword Extraction** – Pull 3-5 keywords from script
- [ ] **Auto Asset Selection** – AI picks best matching stock footage
- [ ] **Simple Layering** – Add stock footage behind avatar automatically
- [ ] **Basic Timing** – Sync stock footage with script timing

---

## Phase 5 – Simple Video Generation *(Week 2)*

### Remotion Integration (Basic)
- [ ] **JSON Timeline Generator** – Convert selections to Remotion config
- [ ] **Avatar + B-Roll Template** – Single template for avatar with background
- [ ] **Platform Format** – Generate correct aspect ratio (9:16 for TikTok/IG, 16:9 for YouTube)
- [ ] **Basic Captions** – Simple text overlay with script content

### Essential Video Features
- [ ] **Avatar Video Layer** – Main avatar video from HeyGen
- [ ] **Background Stock Layer** – Simple stock footage background
- [ ] **Caption Layer** – Basic white text with black outline
- [ ] **Audio Sync** – Ensure avatar voice matches video timing

---

## Phase 6 – MVP Chat Interface *(Week 2)*

### Basic Chat UI
- [ ] **Simple Chat Component** – Basic message list + input
- [ ] **Message Types** – Render text, script options, avatar gallery, voice selector
- [ ] **Script Selection UI** – 3 cards with script options
- [ ] **Avatar Selection UI** – Simple grid with avatar thumbnails
- [ ] **Voice Selection UI** – List with play buttons for preview

### Essential UX
- [ ] **Conversation List** – Show recent conversations
- [ ] **Message History** – Load conversation history
- [ ] **Typing Indicators** – Show when AI is thinking
- [ ] **Progress Updates** – Show video generation progress

---

## Phase 7 – Testing & Launch *(Week 3)*

### MVP Testing
- [ ] **End-to-End Flow** – Test complete user journey
- [ ] **Script Quality** – Ensure scripts are engaging and platform-appropriate  
- [ ] **Video Quality** – Verify generated videos are good quality
- [ ] **Performance** – Ensure reasonable response times

### Essential Fixes
- [ ] **Error Handling** – Graceful failures with helpful messages
- [ ] **Loading States** – Clear feedback during processing
- [ ] **Basic Validation** – Prevent common user errors
- [ ] **Mobile Responsive** – Basic mobile compatibility

---

## 🚫 NOT in MVP (Save for Later)

### Advanced Features (Post-MVP)
- ❌ ~~Message partitioning and advanced DB optimization~~
- ❌ ~~Message threading and complex workflows~~  
- ❌ ~~Advanced caching and performance optimization~~
- ❌ ~~Message reactions and feedback systems~~
- ❌ ~~Full-text search across conversations~~
- ❌ ~~Advanced analytics and user behavior tracking~~
- ❌ ~~Multiple stock footage APIs and fallbacks~~
- ❌ ~~Advanced video templates and effects~~
- ❌ ~~Content calendar and strategy features~~
- ❌ ~~A/B testing and optimization frameworks~~

### Simple Assumptions for MVP
- ✅ **Single user per conversation** (no collaboration)
- ✅ **Recent conversations only** (no infinite history)
- ✅ **Basic error handling** (no complex retry logic)
- ✅ **Single stock source** (Pexels only)
- ✅ **One video template** (avatar + background + captions)
- ✅ **Auto asset selection** (no manual asset picking)

---

## 📊 MVP Success Metrics

### Core Goals
- **Time to Video**: User input → finished video in <5 minutes
- **Success Rate**: 80%+ users complete full workflow  
- **Video Quality**: Generated videos are platform-ready
- **User Satisfaction**: 4+ stars average rating

### Technical Targets
- **Response Time**: AI responses within 3 seconds
- **Video Generation**: Complete videos within 4 minutes
- **Uptime**: 99%+ availability during testing
- **Error Rate**: <10% of workflows fail

---

## 🚀 3-Week MVP Timeline

### **Week 1: Foundation**
- Day 1-2: Deploy simple chat system + basic agent
- Day 3-4: Integrate existing tools (scripts, avatars, voices)
- Day 5-7: Test core AI conversation flow

### **Week 2: Video Generation**  
- Day 1-3: Pexels integration + basic asset matching
- Day 4-5: Remotion template + video generation
- Day 6-7: End-to-end video creation testing

### **Week 3: UI + Polish**
- Day 1-3: Build essential chat interface
- Day 4-5: Testing and bug fixes
- Day 6-7: MVP launch preparation

---

**Focus: Get the core workflow working perfectly before adding any advanced features. Users should be able to generate videos immediately and be impressed by the results.**