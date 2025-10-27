import express, { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { analyzeDesign, initializeGemini } from './gemini';
import { AnalyzeRequest } from './schema';

// Load environment variables from backend/.env
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(express.json({ limit: '10mb' }));

// CORS middleware for local development
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }

  next();
});

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    geminiApiKeyConfigured: !!process.env.GEMINI_API_KEY
  });
});

// Main analysis endpoint
app.post('/analyze', async (req: Request, res: Response) => {
  const startTime = Date.now();
  console.log('\n=== NEW ANALYSIS REQUEST ===');

  try {
    const request: AnalyzeRequest = req.body;

    // Validation
    if (!request.primaryTask || request.primaryTask.trim().length === 0) {
      console.error('[Validation Error] Primary task is required');
      res.status(400).json({
        error: 'Validation Error',
        message: 'Primary task is required and cannot be empty'
      });
      return;
    }

    console.log('[Request] Primary Task:', request.primaryTask);
    if (request.secondaryTask) console.log('[Request] Secondary Task:', request.secondaryTask);
    if (request.persona) console.log('[Request] Persona:', request.persona);
    if (request.constraints) console.log('[Request] Constraints:', request.constraints);

    if (request.frameSnapshot) {
      console.log('[Request] Frame:', request.frameSnapshot.title);
      console.log('[Request] Selection:', request.frameSnapshot.selectionSummary.nodeCount, 'nodes');
    } else {
      console.log('[Request] No frame snapshot provided (text-only analysis)');
    }

    // Call Gemini
    const result = await analyzeDesign(request);

    const duration = Date.now() - startTime;
    console.log(`[Response] Analysis completed in ${duration}ms`);
    console.log('=== END REQUEST ===\n');

    res.json(result);

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`[Error] Analysis failed after ${duration}ms:`, error);

    res.status(500).json({
      error: 'Analysis Error',
      message: error.message || 'An unexpected error occurred during analysis',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} does not exist`
  });
});

// Global error handler
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('[Unhandled Error]:', error);
  res.status(500).json({
    error: 'Internal Server Error',
    message: error.message,
    details: process.env.NODE_ENV === 'development' ? error.stack : undefined
  });
});

// Start server
app.listen(PORT, () => {
  console.log('\n╔════════════════════════════════════════════════════╗');
  console.log('║  Task-aware Design Copilot Backend                ║');
  console.log('╚════════════════════════════════════════════════════╝');
  console.log(`\n✅ Server running on http://localhost:${PORT}`);
  console.log(`✅ Gemini API Key: ${process.env.GEMINI_API_KEY ? 'Configured' : 'MISSING'}`);
  console.log(`\nAvailable endpoints:`);
  console.log(`  GET  /health         - Health check`);
  console.log(`  POST /analyze        - Design analysis\n`);
});
