import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { GenerateDesignRequest, GenerateDesignResponse } from './schema';

/**
 * Schema for generate-design response
 */
export const generateDesignSchema = {
  type: SchemaType.OBJECT,
  properties: {
    scaffoldSpec: {
      type: SchemaType.OBJECT,
      properties: {
        frame: {
          type: SchemaType.OBJECT,
          properties: {
            width: { type: SchemaType.NUMBER },
            height: { type: SchemaType.NUMBER },
            layoutMode: { type: SchemaType.STRING },
            gap: { type: SchemaType.NUMBER, nullable: true },
            padding: { type: SchemaType.NUMBER, nullable: true }
          },
          required: ['width', 'height', 'layoutMode']
        },
        regions: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              name: { type: SchemaType.STRING },
              height: { type: SchemaType.NUMBER, nullable: true },
              layoutMode: { type: SchemaType.STRING, nullable: true },
              gap: { type: SchemaType.NUMBER, nullable: true },
              padding: { type: SchemaType.NUMBER, nullable: true },
              nodes: {
                type: SchemaType.ARRAY,
                items: {
                  type: SchemaType.OBJECT,
                  properties: {
                    type: { type: SchemaType.STRING },
                    componentName: { type: SchemaType.STRING, nullable: true },
                    textOverride: { type: SchemaType.STRING, nullable: true }
                  },
                  required: ['type']
                }
              }
            },
            required: ['name', 'nodes']
          }
        }
      },
      required: ['frame', 'regions']
    },
    proposal: {
      type: SchemaType.OBJECT,
      properties: {
        title: { type: SchemaType.STRING },
        why: { type: SchemaType.STRING },
        patternsUsed: {
          type: SchemaType.ARRAY,
          items: { type: SchemaType.STRING }
        }
      },
      required: ['title', 'why', 'patternsUsed']
    }
  },
  required: ['scaffoldSpec', 'proposal']
};

/**
 * Build prompt for design generation
 */
export function buildDesignPrompt(request: GenerateDesignRequest): string {
  const { primaryTask, secondaryTask, persona, constraints, frameSnapshot, analysisResults } = request;

  let prompt = "You are a senior product designer creating complete, cohesive design layouts for desktop web interfaces. ";
  prompt += "Generate a scaffoldSpec with 2-4 regions, using Material Web component names. ";
  prompt += "Prioritize clarity, accessibility, and logical information hierarchy.\\n\\n";

  prompt += "---\\n\\n";

  if (frameSnapshot) {
    prompt += "**CURRENT DESIGN CONTEXT**:\\n";
    prompt += `- Frame: "${frameSnapshot.title}"\\n`;
    prompt += `- Contains ${frameSnapshot.selectionSummary.nodeCount} elements\\n`;
    if (frameSnapshot.selectionSummary.textSamples.length > 0) {
      prompt += `- Visible Text: ${frameSnapshot.selectionSummary.textSamples.map(t => `"${t}"`).join(', ')}\\n`;
    }
    prompt += "\\n";
  }

  prompt += "**Task Context**:\\n";
  prompt += `- Primary Task: ${primaryTask}\\n`;
  if (secondaryTask) {
    prompt += `- Secondary Task: ${secondaryTask}\\n`;
  }
  if (persona) {
    prompt += `- Persona: ${persona}\\n`;
  }
  if (constraints) {
    prompt += `- Constraints: ${constraints}\\n`;
  }

  if (analysisResults && analysisResults.patterns.length > 0) {
    prompt += "\\n**Suggested Patterns** (integrate these into your design):\\n";
    analysisResults.patterns.forEach(p => {
      prompt += `- ${p.name}: ${p.rationale || p.why}\\n`;
      if (p.components && p.components.length > 0) {
        prompt += `  Components: ${p.components.join(', ')}\\n`;
      }
    });
  }

  prompt += "\\n---\\n\\n";
  prompt += "**Instructions**:\\n";
  prompt += "1. Create a cohesive layout (1200-1440px wide) that integrates ALL suggested patterns.\\n";
  prompt += "2. Organize content into 2-4 logical regions (e.g., Header, Search, Main Content, Actions).\\n";
  prompt += "3. Use Material Web component names:\\n";
  prompt += "   - Buttons: md-filled-button, md-outlined-button, md-text-button\\n";
  prompt += "   - Text fields: md-outlined-text-field, md-filled-text-field\\n";
  prompt += "   - Lists: md-list, md-list-item\\n";
  prompt += "   - Cards: md-elevated-card, md-filled-card, md-outlined-card\\n";
  prompt += "   - Other: md-checkbox, md-switch, md-dialog, md-divider, md-icon, md-fab, md-chip\\n";
  prompt += "4. Set appropriate layout modes (VERTICAL for main frame, HORIZONTAL for button groups).\\n";
  prompt += "5. Add text overrides for labels, headings, and descriptions.\\n";
  prompt += "6. Use 'divider' type for visual separation between regions.\\n";
  prompt += "7. Generate a proposal explaining the design rationale.\\n";
  prompt += "\\nIMPORTANT: Return only valid JSON matching the scaffoldSpec schema.\\n";

  return prompt;
}

/**
 * Generate a complete design based on task and patterns
 */
export async function generateDesign(genAI: GoogleGenerativeAI, request: GenerateDesignRequest): Promise<GenerateDesignResponse> {
  console.log('[Gemini] Starting design generation...');
  console.log('[Gemini] Primary task:', request.primaryTask);

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash-exp',
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: generateDesignSchema,
    },
  });

  const prompt = buildDesignPrompt(request);
  console.log('[Gemini] Prompt length:', prompt.length, 'characters');

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    console.log('[Gemini] Response received, length:', text.length);

    let parsedResponse: GenerateDesignResponse;
    try {
      parsedResponse = JSON.parse(text);
    } catch (parseError) {
      console.error('[Gemini] JSON parse error:', parseError);
      throw new Error('Failed to parse Gemini response as JSON');
    }

    console.log('[Gemini] Design generation complete');
    console.log('[Gemini] Proposal:', parsedResponse.proposal.title);
    console.log('[Gemini] Regions:', parsedResponse.scaffoldSpec.regions.length);
    console.log('[Gemini] Patterns used:', parsedResponse.proposal.patternsUsed.join(', '));

    return parsedResponse;
  } catch (error) {
    console.error('[Gemini] Error during design generation:', error);
    throw error;
  }
}
