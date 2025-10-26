# Build Plan: Task-aware Design Copilot (MVP, Desktop)

## Project Goal
Build a Figma plugin that takes designer task context + current frame snapshot, returns flows, 5 UX improvements, pattern suggestions, WCAG notes, with Material Web component previews and canvas annotation capabilities.

---

## Phase 1: Foundation & Research ⏳ 30 min
**Status**: ✅ COMPLETE

### Tasks
- [x] Create project structure (plugin/ and backend/ folders)
- [x] Save BUILD_PLAN.md and USER_STORY.md
- [x] Research best Gemini model for UX analysis (chose Gemini 2.5 Flash)
- [x] Initialize TypeScript configs, package.json
- [x] Clone `material-components/material-web` repo
- [x] Create basic manifest.json

### Deliverable
✅ Project skeleton ready with all dependencies installed.

---

## Phase 2: Backend Core ⏳ 45 min
**Status**: ✅ COMPLETE

### Tasks
- [x] Set up Express server on localhost:4000
- [x] Implement Gemini API integration (using Gemini 2.0 Flash Exp with structured JSON)
- [x] Create `/analyze` endpoint (accepts payload)
- [x] Test Gemini with sample prompt (8.9s response time ✅)
- [x] Add comprehensive error logging
- [x] Create pattern_map.json

### Test Results
- Response time: 8.9s (target: <15s) ✅
- Returns exactly 5 UX improvements ✅
- Returns 3-5 pattern suggestions ✅
- WCAG notes include both LLM + heuristic checks ✅

### Deliverable
✅ Backend can call Gemini and return structured JSON.

---

## Phase 3: Plugin Snapshot Logic ⏳ 30 min
**Status**: ✅ COMPLETE

### Tasks
- [x] Build `code.ts` to extract selection data
- [x] Implement frameSnapshot builder (nodes, text, colors, components)
- [x] Send snapshot to UI
- [x] Handle "no selection" case
- [x] Implement canvas note insertion (sticky notes)
- [x] Implement component scaffold insertion

### Deliverable
✅ Plugin can capture selection metadata and send to UI.

---

## Phase 4: Plugin UI - Input & API Call ⏳ 45 min
**Status**: ✅ COMPLETE

### Tasks
- [x] Build HTML form (task, persona, constraints, system prompt)
- [x] "Use current selection" + "Analyze" buttons
- [x] Loading animation with status messages
- [x] Call backend `/analyze` with payload
- [x] Display formatted results (flows, improvements, patterns, WCAG)
- [x] Error handling and display
- [x] Pattern insertion buttons
- [x] Add notes to canvas button

### Deliverable
✅ Full round-trip working (plugin → backend → LLM → plugin).

---

## Phase 5: Display Results - Text Only ⏳ 1 hour
**Status**: PENDING

### Tasks
- [ ] Parse and display Flows (primary, secondary, edge cases)
- [ ] Display 5 UX Improvements (title, rationale, howToApply)
- [ ] Display Pattern Suggestions with:
  - Pattern name
  - "Why this fits" text
  - Material Web component names (text list)
  - NO images yet, just text placeholders
- [ ] Display WCAG Notes
- [ ] Style sections clearly

### Deliverable
All LLM results shown clearly in UI.

---

## Phase 6: Material Web Integration ⏳ 1.5 hours
**Status**: PENDING

### Tasks
- [ ] Analyze cloned material-web repo structure
- [ ] Create mapping: pattern → actual component code files
- [ ] Implement preview generation strategy:
  - Extract component examples from material-web
  - Take screenshots OR reference existing demos
  - Store in assets/ folder
- [ ] Show preview thumbnails in Pattern Suggestions section
- [ ] Implement click-to-enlarge functionality

### Deliverable
Visual previews appear for each pattern.

---

## Phase 7: Canvas Operations ⏳ 1 hour
**Status**: PENDING

### Tasks
- [ ] Implement "Add notes to canvas" (sticky note style)
- [ ] Implement "Insert wireframe placeholder":
  - Use material-web component structure
  - Generate actual UI nodes (not rectangles)
  - Position near selection
- [ ] Test positioning and naming
- [ ] Handle edge cases (no selection, large canvases)

### Deliverable
Can insert components and annotations on canvas.

---

## Success Criteria (Demo)
- [ ] After Analyze, show flows, exactly 5 improvements, 3–5 pattern suggestions with preview thumbnails and Material Web component names
- [ ] "Insert wireframe placeholder" places Material Web component scaffold in-canvas near the selection
- [ ] "Add notes to canvas" drops concise sticky note annotations
- [ ] Round-trip under 15 seconds
- [ ] All outputs are task-aligned, actionable, and accessible

---

## Technical Stack (Decided)
- **Plugin**: TypeScript, Figma Plugin API (manifest v2)
- **Build Tool**: TBD (esbuild/webpack/vite)
- **Backend**: Node.js, Express, TypeScript
- **LLM**: Gemini (model TBD based on research)
- **UI Framework**: TBD (vanilla/React)
- **Port**: localhost:4000
- **Design System**: Material Web Components

---

## Notes & Decisions Log
- Port changed from 3001 → 4000 per user preference
- Must use actual Material Web components, NOT placeholder rectangles
- Loading states must show what's loading for debugging
- Error messages must be comprehensive for partnership debugging
- Asset creation uses Material Web GitHub repo components
