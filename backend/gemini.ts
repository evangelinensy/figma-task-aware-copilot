import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { AnalyzeRequest, AnalyzeResponse, PatternMap, GenerateDesignRequest, GenerateDesignResponse } from './schema';
import patternMapData from './mappings/pattern_map.json';

const patternMap: PatternMap = patternMapData;

let genAI: GoogleGenerativeAI;

export function initializeGemini(): GoogleGenerativeAI {
  if (!genAI) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not set in environment variables');
    }
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return genAI;
}

// Define the response schema for Gemini structured output
const responseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    flows: {
      type: SchemaType.OBJECT,
      properties: {
        primary: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
        secondary: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
        edgeCases: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }
      },
      required: ['primary', 'secondary', 'edgeCases']
    },
    uxImprovements: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          title: { type: SchemaType.STRING },
          rationale: { type: SchemaType.STRING },
          howToApply: { type: SchemaType.STRING },
          suggestedComponents: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
            nullable: true
          }
        },
        required: ['title', 'rationale', 'howToApply']
      }
    },
    patterns: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          name: { type: SchemaType.STRING },
          why: { type: SchemaType.STRING },
          componentsHint: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
            nullable: true
          }
        },
        required: ['name', 'why']
      }
    },
    wcagNotes: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          issue: { type: SchemaType.STRING },
          detail: { type: SchemaType.STRING },
          fix: { type: SchemaType.STRING }
        },
        required: ['issue', 'detail', 'fix']
      }
    },
    canvasNotes: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING }
    }
  },
  required: ['flows', 'uxImprovements', 'patterns', 'wcagNotes', 'canvasNotes']
};

/**
 * Build the prompt for Gemini based on user inputs and frame snapshot
 */
function buildPrompt(request: AnalyzeRequest): string {
  const { primaryTask, secondaryTask, persona, constraints, systemPrompt, frameSnapshot } = request;

  let prompt = systemPrompt ||
    "You are a senior product designer. Provide task-focused, context-aware guidance. " +
    "Analyze the current design, then suggest improvements. " +
    "Use Material Web component names. Keep all responses BRIEF (1-2 sentences max per item).";

  prompt += "\n\n---\n\n";

  if (frameSnapshot) {
    prompt += "**CURRENT DESIGN CONTEXT** (ANALYZE THIS FIRST):\n";
    prompt += `- Frame Name: "${frameSnapshot.title}"\n`;
    prompt += `- Contains ${frameSnapshot.selectionSummary.nodeCount} UI elements\n`;
    prompt += `- Element Types: ${frameSnapshot.selectionSummary.nodeTypes.join(', ')}\n`;

    if (frameSnapshot.selectionSummary.textSamples.length > 0) {
      prompt += `- Visible Text: ${frameSnapshot.selectionSummary.textSamples.map(t => `"${t}"`).join(', ')}\n`;
      prompt += "  → Use this text to understand what type of interface this is (e.g., chat, form, dashboard, etc.)\n";
    }

    if (frameSnapshot.selectionSummary.componentNames.length > 0) {
      prompt += `- Existing Components: ${frameSnapshot.selectionSummary.componentNames.join(', ')}\n`;
    }

    if (frameSnapshot.colorSamples.length > 0) {
      prompt += `- Color Palette: ${frameSnapshot.colorSamples.join(', ')}\n`;
    }

    prompt += "\n**CRITICAL**: Based on the frame name and visible text above, identify what type of interface this is. ";
    prompt += "For example, if the text contains chat-related terms or message content, this is a CHAT interface, NOT a dashboard. ";
    prompt += "If it contains form fields and labels, it's a FORM interface. Ground your analysis in the actual design.\n";
  }

  prompt += "\n**User's Task Context**:\n";
  prompt += `- Primary Task: ${primaryTask}\n`;

  if (secondaryTask) {
    prompt += `- Secondary Task: ${secondaryTask}\n`;
  }

  if (persona) {
    prompt += `- Persona: ${persona}\n`;
  }

  if (constraints) {
    prompt += `- Constraints: ${constraints}\n`;
  }

  prompt += "\n---\n\n";
  prompt += "**Instructions** (KEEP ALL TEXT CONCISE - 1-2 sentences max):\n";
  prompt += "1. Analyze the Current Design Context to identify interface type.\n";
  prompt += "2. Provide 3-5 flow steps per flow type that match the ACTUAL interface.\n";
  prompt += "3. Suggest EXACTLY 5 UX improvements:\n";
  prompt += "   - title: Brief improvement name\n";
  prompt += "   - rationale: 1 sentence why it's needed\n";
  prompt += "   - howToApply: 1 sentence how to fix it\n";
  prompt += "   - suggestedComponents: Array of 1-3 Material Web component names to implement the fix (e.g., ['md-headline-medium', 'md-filled-button'])\n";
  prompt += "4. Suggest 3-5 patterns with brief rationale (1 sentence) and Material Web components.\n";
  prompt += "5. Provide 3-5 WCAG notes (issue + 1 sentence detail + 1 sentence fix).\n";
  prompt += "6. Generate 3 canvas notes (1-2 sentences each): top problems, actionable suggestions, insights.\n";
  prompt += "\nKEEP IT BRIEF: All rationales, details, and fixes must be 1-2 sentences maximum.\n";

  return prompt;
}

/**
 * Enrich pattern suggestions with Material Web component mappings
 */
function enrichPatterns(patterns: AnalyzeResponse['patterns']): AnalyzeResponse['patterns'] {
  return patterns.map(pattern => {
    const mapping = patternMap[pattern.name];

    if (mapping) {
      // Use mapping data to enrich the pattern
      const enriched = {
        ...pattern,
        components: mapping.components,
        previews: mapping.previews,
      };

      // Use rationaleTemplate as fallback if LLM's "why" is weak (< 20 chars) or missing
      if (!pattern.why || pattern.why.length < 20) {
        enriched.rationale = mapping.rationaleTemplate;
      } else {
        enriched.rationale = pattern.why;
      }

      return enriched;
    }

    // No mapping found - return pattern with LLM data only
    return {
      ...pattern,
      rationale: pattern.why,
      components: pattern.componentsHint || [],
      previews: []
    };
  });
}

/**
 * Validate and cap response arrays to specified limits
 */
function validateResponse(response: AnalyzeResponse): AnalyzeResponse {
  return {
    flows: {
      primary: response.flows.primary.slice(0, 10),
      secondary: response.flows.secondary.slice(0, 10),
      edgeCases: response.flows.edgeCases.slice(0, 10)
    },
    uxImprovements: response.uxImprovements.slice(0, 5), // Exactly 5
    patterns: response.patterns.slice(0, 5), // 3-5 patterns
    wcagNotes: response.wcagNotes.slice(0, 8),
    canvasNotes: response.canvasNotes.slice(0, 4)
  };
}

/**
 * Generate heuristic WCAG checks based on frame snapshot
 */
function generateHeuristicWCAGNotes(request: AnalyzeRequest): AnalyzeResponse['wcagNotes'] {
  const notes: AnalyzeResponse['wcagNotes'] = [];
  const snapshot = request.frameSnapshot;

  if (!snapshot) return notes;

  // Check for low-contrast color combinations
  const lightColors = snapshot.colorSamples.filter(c =>
    c.toLowerCase().match(/^#(f|e|d|c)[0-9a-f]{5}$/i)
  );

  if (lightColors.length > 0) {
    notes.push({
      issue: "Potential low contrast detected",
      detail: `Light colors found: ${lightColors.join(', ')}. Ensure text contrast ratio ≥ 4.5:1 for normal text.`,
      fix: "Use a contrast checker tool and adjust foreground/background colors to meet WCAG AA standards."
    });
  }

  // Check for potential placeholder-only labels
  const hasFormFields = snapshot.selectionSummary.nodeTypes.includes('INSTANCE') ||
    snapshot.selectionSummary.textSamples.some(t =>
      t.toLowerCase().match(/email|password|search|name|phone/)
    );

  if (hasFormFields) {
    notes.push({
      issue: "Form field labels",
      detail: "Ensure all form fields have explicit labels, not just placeholder text.",
      fix: "Add visible <label> elements or aria-label attributes for screen readers."
    });
  }

  return notes;
}

/**
 * Call Gemini API to analyze the design and return structured suggestions
 */
export async function analyzeDesign(request: AnalyzeRequest): Promise<AnalyzeResponse> {
  console.log('[Gemini] Starting analysis...');
  console.log('[Gemini] Primary task:', request.primaryTask);

  const ai = initializeGemini();
  const model = ai.getGenerativeModel({
    model: 'gemini-2.0-flash-exp',
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: responseSchema,
    },
  });

  const prompt = buildPrompt(request);
  console.log('[Gemini] Prompt length:', prompt.length, 'characters');

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    console.log('[Gemini] Response received, length:', text.length);

    let parsedResponse: AnalyzeResponse;
    try {
      parsedResponse = JSON.parse(text);
    } catch (parseError) {
      console.error('[Gemini] JSON parse error:', parseError);
      throw new Error('Failed to parse Gemini response as JSON');
    }

    // Validate and cap arrays
    parsedResponse = validateResponse(parsedResponse);

    // Enrich patterns with Material Web mappings
    parsedResponse.patterns = enrichPatterns(parsedResponse.patterns);

    // Add heuristic WCAG notes
    const heuristicNotes = generateHeuristicWCAGNotes(request);
    parsedResponse.wcagNotes = [...parsedResponse.wcagNotes, ...heuristicNotes];

    console.log('[Gemini] Analysis complete');
    console.log('[Gemini] Flows:', parsedResponse.flows.primary.length, 'primary,', parsedResponse.flows.secondary.length, 'secondary');
    console.log('[Gemini] UX Improvements:', parsedResponse.uxImprovements.length);
    console.log('[Gemini] Patterns:', parsedResponse.patterns.length);
    console.log('[Gemini] WCAG Notes:', parsedResponse.wcagNotes.length);

    return parsedResponse;
  } catch (error) {
    console.error('[Gemini] Error during analysis:', error);
    throw error;
  }
}
