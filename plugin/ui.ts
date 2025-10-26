/**
 * Figma Plugin UI Logic
 */

console.log('[UI] ui.ts is loading...');

interface FrameSnapshot {
  title: string;
  selectionSummary: {
    nodeCount: number;
    nodeTypes: string[];
    textSamples: string[];
    componentNames: string[];
  };
  colorSamples: string[];
}

interface AnalyzeResponse {
  flows: {
    primary: string[];
    secondary: string[];
    edgeCases: string[];
  };
  uxImprovements: Array<{
    title: string;
    rationale: string;
    howToApply: string;
  }>;
  patterns: Array<{
    name: string;
    why?: string;
    rationale?: string;
    components?: string[];
    componentsHint?: string[];
    previews?: string[];
  }>;
  wcagNotes: Array<{
    issue: string;
    detail: string;
    fix: string;
  }>;
  canvasNotes: string[];
}

// State
let currentSnapshot: FrameSnapshot | null = null;
let currentResults: AnalyzeResponse | null = null;

// Wait for DOM to be ready
console.log('[UI] Waiting for DOM...');

// DOM Elements - get them after DOM is ready
let primaryTaskInput: HTMLInputElement;
let secondaryTaskInput: HTMLInputElement;
let personaInput: HTMLInputElement;
let constraintsInput: HTMLTextAreaElement;
let systemPromptInput: HTMLTextAreaElement;
let captureBtn: HTMLButtonElement;
let analyzeBtn: HTMLButtonElement;
let addNotesBtn: HTMLButtonElement;
let selectionStatus: HTMLDivElement;
let inputSection: HTMLDivElement;
let loadingSection: HTMLDivElement;
let loadingText: HTMLDivElement;
let errorSection: HTMLDivElement;
let errorMessage: HTMLParagraphElement;
let resultsSection: HTMLDivElement;
let flowsContent: HTMLDivElement;
let improvementsContent: HTMLDivElement;
let patternsContent: HTMLDivElement;
let wcagContent: HTMLDivElement;

function initializeDOM() {
  console.log('[UI] Initializing DOM elements...');

  primaryTaskInput = document.getElementById('primaryTask') as HTMLInputElement;
  secondaryTaskInput = document.getElementById('secondaryTask') as HTMLInputElement;
  personaInput = document.getElementById('persona') as HTMLInputElement;
  constraintsInput = document.getElementById('constraints') as HTMLTextAreaElement;
  systemPromptInput = document.getElementById('systemPrompt') as HTMLTextAreaElement;

  captureBtn = document.getElementById('captureBtn') as HTMLButtonElement;
  analyzeBtn = document.getElementById('analyzeBtn') as HTMLButtonElement;
  addNotesBtn = document.getElementById('addNotesBtn') as HTMLButtonElement;

  selectionStatus = document.getElementById('selection-status') as HTMLDivElement;
  inputSection = document.getElementById('input-section') as HTMLDivElement;
  loadingSection = document.getElementById('loading') as HTMLDivElement;
  loadingText = document.getElementById('loadingText') as HTMLDivElement;
  errorSection = document.getElementById('error') as HTMLDivElement;
  errorMessage = document.getElementById('errorMessage') as HTMLParagraphElement;
  resultsSection = document.getElementById('results') as HTMLDivElement;

  flowsContent = document.getElementById('flows-content') as HTMLDivElement;
  improvementsContent = document.getElementById('improvements-content') as HTMLDivElement;
  patternsContent = document.getElementById('patterns-content') as HTMLDivElement;
  wcagContent = document.getElementById('wcag-content') as HTMLDivElement;

  console.log('[UI] DOM elements initialized successfully');
}

/**
 * Update selection status display
 */
function updateSelectionStatus(snapshot: FrameSnapshot | null) {
  if (snapshot) {
    selectionStatus.className = 'selection-status';
    selectionStatus.textContent = `✓ Captured: "${snapshot.title}" - ${snapshot.selectionSummary.nodeCount} nodes`;
  } else {
    selectionStatus.className = 'selection-status none';
    selectionStatus.textContent = 'No selection captured. Click "Use current selection" to capture your design.';
  }
}

/**
 * Show loading state
 */
function showLoading(message: string) {
  inputSection.style.display = 'none';
  resultsSection.classList.remove('active');
  errorSection.classList.add('hidden');
  loadingSection.classList.add('active');
  loadingText.textContent = message;
}

/**
 * Hide loading state
 */
function hideLoading() {
  loadingSection.classList.remove('active');
  inputSection.style.display = 'block';
}

/**
 * Show error message
 */
function showError(error: string) {
  hideLoading();
  errorSection.classList.remove('hidden');
  errorMessage.textContent = error;
}

/**
 * Hide error message
 */
function hideError() {
  errorSection.classList.add('hidden');
}

/**
 * Render user flows
 */
function renderFlows(flows: AnalyzeResponse['flows']) {
  let html = '';

  if (flows.primary.length > 0) {
    html += '<h4 style="font-size: 13px; margin-top: 10px; margin-bottom: 6px;">Primary Flow</h4>';
    html += '<ol class="flow-list">';
    flows.primary.forEach(step => {
      html += `<li>${escapeHtml(step)}</li>`;
    });
    html += '</ol>';
  }

  if (flows.secondary.length > 0) {
    html += '<h4 style="font-size: 13px; margin-top: 10px; margin-bottom: 6px;">Secondary Flow</h4>';
    html += '<ol class="flow-list">';
    flows.secondary.forEach(step => {
      html += `<li>${escapeHtml(step)}</li>`;
    });
    html += '</ol>';
  }

  if (flows.edgeCases.length > 0) {
    html += '<h4 style="font-size: 13px; margin-top: 10px; margin-bottom: 6px;">Edge Cases</h4>';
    html += '<ol class="flow-list">';
    flows.edgeCases.forEach(step => {
      html += `<li>${escapeHtml(step)}</li>`;
    });
    html += '</ol>';
  }

  flowsContent.innerHTML = html;
}

/**
 * Render UX improvements
 */
function renderImprovements(improvements: AnalyzeResponse['uxImprovements']) {
  let html = '';

  improvements.forEach((improvement, index) => {
    html += `
      <div class="improvement-item">
        <h4>${index + 1}. ${escapeHtml(improvement.title)}</h4>
        <p><strong>Why:</strong> ${escapeHtml(improvement.rationale)}</p>
        <p><strong>How to apply:</strong> ${escapeHtml(improvement.howToApply)}</p>
      </div>
    `;
  });

  improvementsContent.innerHTML = html;
}

/**
 * Render pattern suggestions
 */
function renderPatterns(patterns: AnalyzeResponse['patterns']) {
  let html = '';

  patterns.forEach((pattern, index) => {
    const components = pattern.components || pattern.componentsHint || [];
    const rationale = pattern.rationale || pattern.why || '';

    html += `
      <div class="pattern-item">
        <h4>${escapeHtml(pattern.name)}</h4>
        <p>${escapeHtml(rationale)}</p>

        ${components.length > 0 ? `
          <div style="margin-top: 8px;">
            <strong style="font-size: 11px; color: #666;">Material Web Components:</strong><br>
            ${components.map(c => `<span class="component-tag">${escapeHtml(c)}</span>`).join('')}
          </div>
        ` : ''}

        <div class="pattern-actions">
          <button class="secondary" data-pattern-index="${index}">
            ⚡ Insert wireframe placeholder
          </button>
        </div>
      </div>
    `;
  });

  patternsContent.innerHTML = html;

  // Add event listeners to insert buttons
  patternsContent.querySelectorAll('button[data-pattern-index]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const index = parseInt((e.target as HTMLElement).getAttribute('data-pattern-index') || '0');
      const pattern = patterns[index];
      const components = pattern.components || pattern.componentsHint || [];

      parent.postMessage({
        pluginMessage: {
          type: 'insert-scaffold',
          patternName: pattern.name,
          components
        }
      }, '*');
    });
  });
}

/**
 * Render WCAG notes
 */
function renderWCAG(wcagNotes: AnalyzeResponse['wcagNotes']) {
  let html = '';

  wcagNotes.forEach(note => {
    html += `
      <div class="wcag-item">
        <h4>⚠️ ${escapeHtml(note.issue)}</h4>
        <p><strong>Issue:</strong> ${escapeHtml(note.detail)}</p>
        <p><strong>Fix:</strong> ${escapeHtml(note.fix)}</p>
      </div>
    `;
  });

  wcagContent.innerHTML = html;
}

/**
 * Display results
 */
function displayResults(results: AnalyzeResponse) {
  currentResults = results;
  hideLoading();
  hideError();

  renderFlows(results.flows);
  renderImprovements(results.uxImprovements);
  renderPatterns(results.patterns);
  renderWCAG(results.wcagNotes);

  resultsSection.classList.add('active');
}

/**
 * Call backend /analyze endpoint
 */
async function analyzeDesign() {
  const primaryTask = primaryTaskInput.value.trim();

  if (!primaryTask) {
    showError('Primary task is required');
    return;
  }

  hideError();
  showLoading('Analyzing design... This may take up to 15 seconds');

  const payload = {
    primaryTask,
    secondaryTask: secondaryTaskInput.value.trim() || undefined,
    persona: personaInput.value.trim() || undefined,
    constraints: constraintsInput.value.trim() || undefined,
    systemPrompt: systemPromptInput.value.trim() || undefined,
    frameSnapshot: currentSnapshot || undefined
  };

  console.log('[UI] Sending analyze request:', payload);

  try {
    const response = await fetch('http://localhost:4000/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    const results: AnalyzeResponse = await response.json();
    console.log('[UI] Analysis results received:', results);

    displayResults(results);
  } catch (error: any) {
    console.error('[UI] Analysis error:', error);
    showError(`Analysis failed: ${error.message || 'Unknown error'}. Make sure the backend server is running on localhost:4000.`);
  }
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function setupEventListeners() {
  console.log('[UI] Setting up event listeners...');

  captureBtn.addEventListener('click', () => {
  console.log('[UI] Requesting selection capture');
  parent.postMessage({ pluginMessage: { type: 'capture-selection' } }, '*');
});

analyzeBtn.addEventListener('click', () => {
  analyzeDesign();
});

addNotesBtn.addEventListener('click', () => {
  if (currentResults && currentResults.canvasNotes.length > 0) {
    parent.postMessage({
      pluginMessage: {
        type: 'insert-notes',
        notes: currentResults.canvasNotes
      }
    }, '*');
  }
});

  console.log('[UI] Event listeners set up successfully');
}

// Listen for messages from plugin code
window.onmessage = (event) => {
  console.log('[UI] Message received:', event);
  const msg = event.data.pluginMessage;
  if (!msg) {
    console.log('[UI] No pluginMessage in event data');
    return;
  }

  console.log('[UI] Plugin message type:', msg.type);

  if (msg.type === 'selection-captured') {
    console.log('[UI] Selection captured, snapshot:', msg.snapshot);
    currentSnapshot = msg.snapshot;
    updateSelectionStatus(currentSnapshot);
  }
};

console.log('[UI] Setting up message listener...');

// Initialize everything when DOM is ready
if (document.readyState === 'loading') {
  console.log('[UI] DOM not ready yet, waiting...');
  document.addEventListener('DOMContentLoaded', () => {
    console.log('[UI] DOMContentLoaded fired');
    initializeDOM();
    setupEventListeners();
    console.log('[UI] UI fully initialized and listening for messages');
  });
} else {
  console.log('[UI] DOM already ready');
  initializeDOM();
  setupEventListeners();
  console.log('[UI] UI fully initialized and listening for messages');
}
