# User Story: Task-aware Design Copilot

## Actor
Product designer using Figma on desktop web projects.

## Preconditions
- Plugin installed in Figma
- Backend running with valid GEMINI_API_KEY
- Designer has at least one frame in the Figma file

---

## Main Flow

### a. Open and Select
Designer opens Figma, navigates to the target file, and selects a relevant frame (e.g., Login screen).

### b. Launch Plugin & Capture Selection
Designer launches the plugin panel and clicks **"Use current selection"** to populate a snapshot containing:
- Node types (FRAME, TEXT, INSTANCE, RECTANGLE, etc.)
- Text samples (up to 10 strings, 80 chars each)
- Component names (if instances are used)
- Color samples (up to 6 hex values from top-level layers)

### c. Enter Context
Designer fills in the form:
- **Primary task** (required) - e.g., "User signs in"
- **Secondary task** (optional) - e.g., "Reset password"
- **Persona** (optional) - e.g., "New desktop user"
- **Constraints** (optional) - e.g., "Use Material Web components; minimal form"
- **System prompt** (optional) - Custom instructions for the LLM

### d. Analyze
Designer clicks **"Analyze"**. The plugin:
- POSTs context + snapshot to backend at `http://localhost:4000/analyze`
- Shows loading animation with status message

### e. Backend Processing
Backend receives request and:
1. Validates `primaryTask` is present
2. Calls Gemini LLM with structured prompt
3. Returns JSON with:
   - **User Flows** (primary/secondary/edge cases)
   - **Exactly 5 UX Improvements** (title, rationale, how to apply)
   - **Pattern Suggestions** (name, why, components hint) - 3 to 5 patterns
   - **WCAG Notes** (issue, detail, fix)
   - **Canvas Notes** (concise annotations)

### f. Display Results
Plugin renders sections:
- **User Flows** - Primary, secondary, and edge case flows
- **Top 5 UX Improvements** - Each with title, rationale, and application guidance
- **Pattern Suggestions** - Shows:
  - Pattern name
  - "Why this fits" explanation
  - Material Web component names (e.g., `md-outlined-text-field`, `md-filled-button`)
  - Preview image thumbnails (from bundled assets)

### g. Add Canvas Annotations
Designer reviews outputs and clicks **"Add notes to canvas"** to:
- Place sticky note style annotations near the selected frame
- Notes contain concise, actionable insights

### h. Insert Component Scaffold (Optional)
Designer clicks **"Insert wireframe placeholder"** on a pattern suggestion to:
- Drop Material Web component scaffold (actual UI nodes, not rectangles)
- Position scaffold near the selection
- Name nodes appropriately (e.g., "Pattern Scaffold: Sign-in form")

### i. Iterate
Designer iterates on the design and may re-run **"Analyze"** to refresh suggestions based on new changes.

---

## Alternate Flows

### No Selection
- Analysis runs on text-only inputs
- Snapshot marks selection as "none"
- All other functionality works normally

### Large Selection
- Snapshot samples up to defined limits:
  - 10 text samples max
  - 6 color samples max
  - 80 chars per text sample
- Banner notes that data was trimmed
- Analysis proceeds with sampled data

### Backend Timeout
- Plugin shows non-blocking error state
- User inputs persist (form doesn't clear)
- Designer can retry without re-entering data
- Error message explains what happened

---

## Success Criteria

### Performance
- ✅ First useful results appear within **15 seconds**

### Output Quality
- ✅ Exactly **5 UX improvements** returned (not 4, not 6)
- ✅ **3–5 pattern suggestions** with:
  - Material Web component names
  - Preview image thumbnails
  - Clear "why this fits" rationale

### Canvas Integration
- ✅ Notes insert reliably
- ✅ Scaffolds insert reliably
- ✅ All inserted nodes are **named clearly** (for easy identification)
- ✅ Positioning is **near the selection** (not random placement)

### Content Quality
- ✅ Outputs are **task-aligned** (relate to the primary/secondary tasks)
- ✅ Outputs are **actionable** (designer knows what to do next)
- ✅ Outputs are **accessible** (WCAG notes are always present and relevant)

---

## Key Principles
1. **Partnership**: Designer and AI work together; errors help both debug
2. **Clarity**: All loading states and errors show what's happening
3. **Material Web First**: Component suggestions always reference Material Web
4. **No Placeholders**: Never insert random rectangles; use actual component structures
5. **Task-Focused**: All suggestions tie back to the designer's stated tasks
