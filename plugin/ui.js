"use strict";
(() => {
  // plugin/ui.ts
  console.log("[UI] ui.ts is loading...");
  var currentSnapshot = null;
  var currentResults = null;
  console.log("[UI] Waiting for DOM...");
  var primaryTaskInput;
  var secondaryTaskInput;
  var personaInput;
  var constraintsInput;
  var systemPromptInput;
  var captureBtn;
  var analyzeBtn;
  var addNotesBtn;
  var selectionStatus;
  var inputSection;
  var loadingSection;
  var loadingText;
  var errorSection;
  var errorMessage;
  var resultsSection;
  var flowsContent;
  var improvementsContent;
  var patternsContent;
  var wcagContent;
  function initializeDOM() {
    console.log("[UI] Initializing DOM elements...");
    primaryTaskInput = document.getElementById("primaryTask");
    secondaryTaskInput = document.getElementById("secondaryTask");
    personaInput = document.getElementById("persona");
    constraintsInput = document.getElementById("constraints");
    systemPromptInput = document.getElementById("systemPrompt");
    captureBtn = document.getElementById("captureBtn");
    analyzeBtn = document.getElementById("analyzeBtn");
    addNotesBtn = document.getElementById("addNotesBtn");
    selectionStatus = document.getElementById("selection-status");
    inputSection = document.getElementById("input-section");
    loadingSection = document.getElementById("loading");
    loadingText = document.getElementById("loadingText");
    errorSection = document.getElementById("error");
    errorMessage = document.getElementById("errorMessage");
    resultsSection = document.getElementById("results");
    flowsContent = document.getElementById("flows-content");
    improvementsContent = document.getElementById("improvements-content");
    patternsContent = document.getElementById("patterns-content");
    wcagContent = document.getElementById("wcag-content");
    console.log("[UI] DOM elements initialized successfully");
  }
  function updateSelectionStatus(snapshot) {
    if (snapshot) {
      selectionStatus.className = "selection-status";
      selectionStatus.textContent = `\u2713 Captured: "${snapshot.title}" - ${snapshot.selectionSummary.nodeCount} nodes`;
    } else {
      selectionStatus.className = "selection-status none";
      selectionStatus.textContent = 'No selection captured. Click "Use current selection" to capture your design.';
    }
  }
  function showLoading(message) {
    inputSection.style.display = "none";
    resultsSection.classList.remove("active");
    errorSection.classList.add("hidden");
    loadingSection.classList.add("active");
    loadingText.textContent = message;
  }
  function hideLoading() {
    loadingSection.classList.remove("active");
    inputSection.style.display = "block";
  }
  function showError(error) {
    hideLoading();
    errorSection.classList.remove("hidden");
    errorMessage.textContent = error;
  }
  function hideError() {
    errorSection.classList.add("hidden");
  }
  function renderFlows(flows) {
    let html = "";
    if (flows.primary.length > 0) {
      html += '<h4 style="font-size: 13px; margin-top: 10px; margin-bottom: 6px;">Primary Flow</h4>';
      html += '<ol class="flow-list">';
      flows.primary.forEach((step) => {
        html += `<li>${escapeHtml(step)}</li>`;
      });
      html += "</ol>";
    }
    if (flows.secondary.length > 0) {
      html += '<h4 style="font-size: 13px; margin-top: 10px; margin-bottom: 6px;">Secondary Flow</h4>';
      html += '<ol class="flow-list">';
      flows.secondary.forEach((step) => {
        html += `<li>${escapeHtml(step)}</li>`;
      });
      html += "</ol>";
    }
    if (flows.edgeCases.length > 0) {
      html += '<h4 style="font-size: 13px; margin-top: 10px; margin-bottom: 6px;">Edge Cases</h4>';
      html += '<ol class="flow-list">';
      flows.edgeCases.forEach((step) => {
        html += `<li>${escapeHtml(step)}</li>`;
      });
      html += "</ol>";
    }
    flowsContent.innerHTML = html;
  }
  function renderImprovements(improvements) {
    let html = "";
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
  function renderPatterns(patterns) {
    let html = "";
    patterns.forEach((pattern, index) => {
      const components = pattern.components || pattern.componentsHint || [];
      const rationale = pattern.rationale || pattern.why || "";
      html += `
      <div class="pattern-item">
        <h4>${escapeHtml(pattern.name)}</h4>
        <p>${escapeHtml(rationale)}</p>

        ${components.length > 0 ? `
          <div style="margin-top: 8px;">
            <strong style="font-size: 11px; color: #666;">Material Web Components:</strong><br>
            ${components.map((c) => `<span class="component-tag">${escapeHtml(c)}</span>`).join("")}
          </div>
        ` : ""}

        <div class="pattern-actions">
          <button class="secondary" data-pattern-index="${index}">
            \u26A1 Insert wireframe placeholder
          </button>
        </div>
      </div>
    `;
    });
    patternsContent.innerHTML = html;
    patternsContent.querySelectorAll("button[data-pattern-index]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const index = parseInt(e.target.getAttribute("data-pattern-index") || "0");
        const pattern = patterns[index];
        const components = pattern.components || pattern.componentsHint || [];
        parent.postMessage({
          pluginMessage: {
            type: "insert-scaffold",
            patternName: pattern.name,
            components
          }
        }, "*");
      });
    });
  }
  function renderWCAG(wcagNotes) {
    let html = "";
    wcagNotes.forEach((note) => {
      html += `
      <div class="wcag-item">
        <h4>\u26A0\uFE0F ${escapeHtml(note.issue)}</h4>
        <p><strong>Issue:</strong> ${escapeHtml(note.detail)}</p>
        <p><strong>Fix:</strong> ${escapeHtml(note.fix)}</p>
      </div>
    `;
    });
    wcagContent.innerHTML = html;
  }
  function displayResults(results) {
    currentResults = results;
    hideLoading();
    hideError();
    renderFlows(results.flows);
    renderImprovements(results.uxImprovements);
    renderPatterns(results.patterns);
    renderWCAG(results.wcagNotes);
    resultsSection.classList.add("active");
  }
  async function analyzeDesign() {
    const primaryTask = primaryTaskInput.value.trim();
    if (!primaryTask) {
      showError("Primary task is required");
      return;
    }
    hideError();
    showLoading("Analyzing design... This may take up to 15 seconds");
    const payload = {
      primaryTask,
      secondaryTask: secondaryTaskInput.value.trim() || void 0,
      persona: personaInput.value.trim() || void 0,
      constraints: constraintsInput.value.trim() || void 0,
      systemPrompt: systemPromptInput.value.trim() || void 0,
      frameSnapshot: currentSnapshot || void 0
    };
    console.log("[UI] Sending analyze request:", payload);
    try {
      const response = await fetch("http://localhost:4000/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }
      const results = await response.json();
      console.log("[UI] Analysis results received:", results);
      displayResults(results);
    } catch (error) {
      console.error("[UI] Analysis error:", error);
      showError(`Analysis failed: ${error.message || "Unknown error"}. Make sure the backend server is running on localhost:4000.`);
    }
  }
  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
  function setupEventListeners() {
    console.log("[UI] Setting up event listeners...");
    captureBtn.addEventListener("click", () => {
      console.log("[UI] Requesting selection capture");
      parent.postMessage({ pluginMessage: { type: "capture-selection" } }, "*");
    });
    analyzeBtn.addEventListener("click", () => {
      analyzeDesign();
    });
    addNotesBtn.addEventListener("click", () => {
      if (currentResults && currentResults.canvasNotes.length > 0) {
        parent.postMessage({
          pluginMessage: {
            type: "insert-notes",
            notes: currentResults.canvasNotes
          }
        }, "*");
      }
    });
    console.log("[UI] Event listeners set up successfully");
  }
  window.onmessage = (event) => {
    console.log("[UI] Message received:", event);
    const msg = event.data.pluginMessage;
    if (!msg) {
      console.log("[UI] No pluginMessage in event data");
      return;
    }
    console.log("[UI] Plugin message type:", msg.type);
    if (msg.type === "selection-captured") {
      console.log("[UI] Selection captured, snapshot:", msg.snapshot);
      currentSnapshot = msg.snapshot;
      updateSelectionStatus(currentSnapshot);
    }
  };
  console.log("[UI] Setting up message listener...");
  if (document.readyState === "loading") {
    console.log("[UI] DOM not ready yet, waiting...");
    document.addEventListener("DOMContentLoaded", () => {
      console.log("[UI] DOMContentLoaded fired");
      initializeDOM();
      setupEventListeners();
      console.log("[UI] UI fully initialized and listening for messages");
    });
  } else {
    console.log("[UI] DOM already ready");
    initializeDOM();
    setupEventListeners();
    console.log("[UI] UI fully initialized and listening for messages");
  }
})();
