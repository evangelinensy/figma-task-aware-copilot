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
