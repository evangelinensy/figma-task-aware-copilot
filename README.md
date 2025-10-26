# Task-aware Design Copilot (MVP, Desktop)

A Figma plugin that provides task-aware UX analysis, design pattern suggestions, and Material Web component recommendations.

## What It Does

- Analyzes your Figma designs in context of user tasks
- Returns user flows, UX improvements, and pattern suggestions
- Shows Material Web component previews and recommendations
- Provides WCAG accessibility notes
- Can insert annotations and component scaffolds onto your canvas

## Setup

### Prerequisites
- Node.js 18+ installed
- Figma desktop app
- Gemini API key (already configured in `.env`)

### Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Build the plugin**
   ```bash
   npm run build
   ```

3. **Start the backend server**
   ```bash
   npm run dev:backend
   ```
   Server will run on `http://localhost:4000`

4. **Load plugin in Figma**
   - Open Figma desktop app
   - Go to Plugins → Development → Import plugin from manifest
   - Select `plugin/manifest.json`

## Usage

See [USER_STORY.md](./USER_STORY.md) for detailed usage flow.

**Quick start:**
1. Select a frame in Figma
2. Open the plugin
3. Click "Use current selection"
4. Enter your primary task (e.g., "User signs in")
5. Click "Analyze"
6. Review flows, improvements, and pattern suggestions
7. Insert annotations or component scaffolds as needed

## Project Structure

```
├── BUILD_PLAN.md          # Development roadmap
├── USER_STORY.md          # Detailed user flows
├── plugin/
│   ├── manifest.json      # Figma plugin manifest
│   ├── code.ts           # Main plugin logic (sandbox)
│   ├── ui.ts             # UI logic
│   ├── ui.html           # Plugin UI
│   ├── assets/           # Component & pattern previews
│   └── mappings/         # Pattern-to-component mapping
├── backend/
│   ├── server.ts         # Express server
│   ├── gemini.ts         # Gemini API integration
│   ├── schema.ts         # Response schemas
│   ├── mappings/         # Pattern mappings
│   └── .env              # API keys (gitignored)
└── material-web/         # Cloned Material Web components
```

## Tech Stack

- **Plugin**: TypeScript, Figma Plugin API
- **Backend**: Node.js, Express, TypeScript
- **LLM**: Google Gemini 2.5 Flash
- **Build Tool**: esbuild
- **Design System**: Material Web Components

## Development

- `npm run build` - Build plugin and backend
- `npm run build:plugin` - Build plugin only
- `npm run build:backend` - Build backend only
- `npm run dev:backend` - Run backend in watch mode
- `npm run start` - Run built backend

## Model Choice

Using **Gemini 2.5 Flash** because:
- Optimized for speed (<15s response time)
- Native structured JSON output
- Cost-effective for high-volume usage
- Excellent reasoning for UX analysis

## Deployment

(Coming in Phase 2)

## License

MIT
