/**
 * Type definitions for API requests and responses
 */

export interface FrameSnapshot {
  title: string;
  selectionSummary: {
    nodeCount: number;
    nodeTypes: string[];
    textSamples: string[];
    componentNames: string[];
  };
  colorSamples: string[];
}

export interface AnalyzeRequest {
  primaryTask: string;
  secondaryTask?: string;
  persona?: string;
  constraints?: string;
  systemPrompt?: string;
  frameSnapshot?: FrameSnapshot;
}

export interface UXImprovement {
  title: string;
  rationale: string;
  howToApply: string;
}

export interface PatternSuggestion {
  name: string;
  why: string;
  componentsHint?: string[];
  // Enriched by backend:
  components?: string[];
  previews?: string[];
  rationale?: string;
}

export interface WCAGNote {
  issue: string;
  detail: string;
  fix: string;
}

export interface AnalyzeResponse {
  flows: {
    primary: string[];
    secondary: string[];
    edgeCases: string[];
  };
  uxImprovements: UXImprovement[];
  patterns: PatternSuggestion[];
  wcagNotes: WCAGNote[];
  canvasNotes: string[];
}

export interface PatternMapping {
  components: string[];
  previews: string[];
  rationaleTemplate: string;
}

export type PatternMap = Record<string, PatternMapping>;

// Generate Design Schema

export interface GenerateDesignRequest {
  primaryTask: string;
  secondaryTask?: string;
  persona?: string;
  constraints?: string;
  systemPrompt?: string;
  frameSnapshot?: FrameSnapshot;
  analysisResults?: AnalyzeResponse; // Optional: use existing analysis
}

export interface ScaffoldNode {
  type: 'component' | 'text' | 'rect' | 'divider';
  componentName?: string; // e.g., 'md-filled-button'
  textOverride?: string;
  propsOverride?: Record<string, any>;
}

export interface ScaffoldRegion {
  name: string;
  height?: number; // Optional, will auto-size if not provided
  layoutMode?: 'HORIZONTAL' | 'VERTICAL';
  gap?: number;
  padding?: number;
  nodes: ScaffoldNode[];
}

export interface ScaffoldSpec {
  frame: {
    width: number;
    height: number;
    layoutMode: 'HORIZONTAL' | 'VERTICAL';
    gap?: number;
    padding?: number;
  };
  regions: ScaffoldRegion[];
}

export interface DesignProposal {
  title: string;
  why: string;
  patternsUsed: string[];
}

export interface GenerateDesignResponse {
  scaffoldSpec: ScaffoldSpec;
  proposal: DesignProposal;
}
