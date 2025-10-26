"use strict";
(() => {
  // plugin/code.ts
  figma.showUI(__html__, {
    width: 480,
    height: 720,
    title: "Task-aware Design Copilot"
  });
  console.log("[Plugin] UI window opened");
  function extractTextSamples(node, samples, maxSamples = 10) {
    if (samples.length >= maxSamples) return;
    if (node.type === "TEXT") {
      const text = node.characters.trim();
      if (text.length > 0 && text.length <= 80) {
        samples.push(text);
      } else if (text.length > 80) {
        samples.push(text.substring(0, 80) + "...");
      }
    }
    if ("children" in node && samples.length < maxSamples) {
      for (const child of node.children) {
        extractTextSamples(child, samples, maxSamples);
        if (samples.length >= maxSamples) break;
      }
    }
  }
  function extractComponentNames(node, names) {
    if (node.type === "INSTANCE" && node.mainComponent) {
      const componentName = node.mainComponent.name;
      if (componentName) {
        names.add(componentName);
      }
    }
    if ("children" in node) {
      for (const child of node.children) {
        extractComponentNames(child, names);
      }
    }
  }
  function extractColors(node, colors, maxColors = 6) {
    if (colors.size >= maxColors) return;
    if ("fills" in node && Array.isArray(node.fills)) {
      for (const fill of node.fills) {
        if (fill.type === "SOLID" && fill.visible !== false) {
          const { r, g, b } = fill.color;
          const hex = `#${Math.round(r * 255).toString(16).padStart(2, "0")}${Math.round(g * 255).toString(16).padStart(2, "0")}${Math.round(b * 255).toString(16).padStart(2, "0")}`.toUpperCase();
          colors.add(hex);
          if (colors.size >= maxColors) break;
        }
      }
    }
  }
  function collectNodeTypes(node, types) {
    types.add(node.type);
    if ("children" in node) {
      for (const child of node.children) {
        collectNodeTypes(child, types);
      }
    }
  }
  function buildFrameSnapshot() {
    const selection = figma.currentPage.selection;
    if (selection.length === 0) {
      console.log("[Plugin] No selection - returning null snapshot");
      return null;
    }
    console.log("[Plugin] Building snapshot from", selection.length, "selected nodes");
    const mainNode = selection[0];
    const title = mainNode.name || "Untitled";
    const nodeTypes = /* @__PURE__ */ new Set();
    const textSamples = [];
    const componentNames = /* @__PURE__ */ new Set();
    const colorSamples = /* @__PURE__ */ new Set();
    let totalNodeCount = 0;
    for (const node of selection) {
      totalNodeCount++;
      collectNodeTypes(node, nodeTypes);
      extractTextSamples(node, textSamples, 10);
      extractComponentNames(node, componentNames);
      extractColors(node, colorSamples, 6);
      if ("children" in node) {
        const countChildren = (n) => {
          let count = 1;
          if ("children" in n) {
            for (const child of n.children) {
              count += countChildren(child);
            }
          }
          return count;
        };
        totalNodeCount += countChildren(node) - 1;
      }
    }
    const snapshot = {
      title,
      selectionSummary: {
        nodeCount: totalNodeCount,
        nodeTypes: Array.from(nodeTypes),
        textSamples: textSamples.slice(0, 10),
        componentNames: Array.from(componentNames)
      },
      colorSamples: Array.from(colorSamples).slice(0, 6)
    };
    console.log("[Plugin] Snapshot created:", JSON.stringify(snapshot, null, 2));
    return snapshot;
  }
  async function insertCanvasNotes(notes) {
    const selection = figma.currentPage.selection;
    if (selection.length === 0) {
      figma.notify("\u26A0\uFE0F Please select a frame first to position the notes");
      return;
    }
    const baseNode = selection[0];
    const startX = baseNode.x + baseNode.width + 50;
    let currentY = baseNode.y;
    console.log("[Plugin] Inserting", notes.length, "canvas notes");
    await figma.loadFontAsync({ family: "Inter", style: "Regular" });
    await figma.loadFontAsync({ family: "Inter", style: "Bold" });
    for (let i = 0; i < notes.length; i++) {
      const note = notes[i];
      const stickyNote = figma.createFrame();
      stickyNote.name = `Note ${i + 1}`;
      stickyNote.x = startX;
      stickyNote.y = currentY;
      stickyNote.fills = [{ type: "SOLID", color: { r: 1, g: 0.95, b: 0.6 } }];
      stickyNote.cornerRadius = 8;
      stickyNote.layoutMode = "VERTICAL";
      stickyNote.paddingLeft = 16;
      stickyNote.paddingRight = 16;
      stickyNote.paddingTop = 16;
      stickyNote.paddingBottom = 16;
      stickyNote.itemSpacing = 8;
      stickyNote.resize(280, 100);
      const header = figma.createText();
      header.fontName = { family: "Inter", style: "Bold" };
      header.fontSize = 13;
      header.characters = `\u{1F4A1} Note ${i + 1}`;
      header.fills = [{ type: "SOLID", color: { r: 0.1, g: 0.1, b: 0.1 } }];
      stickyNote.appendChild(header);
      const content = figma.createText();
      content.fontName = { family: "Inter", style: "Regular" };
      content.fontSize = 12;
      content.characters = note;
      content.fills = [{ type: "SOLID", color: { r: 0.2, g: 0.2, b: 0.2 } }];
      content.textAutoResize = "HEIGHT";
      content.resize(248, content.height);
      stickyNote.appendChild(content);
      currentY += stickyNote.height + 20;
    }
    figma.notify(`\u2705 Added ${notes.length} notes to canvas`);
  }
  async function createComponentVisual(componentName, yPosition) {
    const componentFrame = figma.createFrame();
    componentFrame.name = componentName;
    componentFrame.y = yPosition;
    await figma.loadFontAsync({ family: "Inter", style: "Regular" });
    await figma.loadFontAsync({ family: "Inter", style: "Medium" });
    const primaryColor = { r: 0.043, g: 0.388, b: 0.965 };
    const surfaceColor = { r: 1, g: 1, b: 1 };
    const onSurfaceColor = { r: 0.11, g: 0.11, b: 0.11 };
    const outlineColor = { r: 0.46, g: 0.46, b: 0.46 };
    if (componentName.includes("text-field") || componentName.includes("textfield")) {
      componentFrame.resize(280, 56);
      componentFrame.fills = [{ type: "SOLID", color: surfaceColor }];
      if (componentName.includes("outlined")) {
        componentFrame.strokes = [{ type: "SOLID", color: outlineColor }];
        componentFrame.strokeWeight = 1;
        componentFrame.cornerRadius = 4;
      } else {
        componentFrame.fills = [{ type: "SOLID", color: { r: 0.96, g: 0.96, b: 0.96 } }];
        componentFrame.cornerRadius = 4;
        componentFrame.topLeftRadius = 4;
        componentFrame.topRightRadius = 4;
        componentFrame.bottomLeftRadius = 0;
        componentFrame.bottomRightRadius = 0;
        const bottomBorder = figma.createRectangle();
        bottomBorder.resize(280, 1);
        bottomBorder.y = 55;
        bottomBorder.fills = [{ type: "SOLID", color: onSurfaceColor }];
        componentFrame.appendChild(bottomBorder);
      }
      const label = figma.createText();
      label.fontName = { family: "Inter", style: "Regular" };
      label.fontSize = 12;
      label.characters = "Label";
      label.fills = [{ type: "SOLID", color: { r: 0.6, g: 0.6, b: 0.6 } }];
      label.x = 16;
      label.y = 8;
      componentFrame.appendChild(label);
      const input = figma.createText();
      input.fontName = { family: "Inter", style: "Regular" };
      input.fontSize = 16;
      input.characters = "Enter text...";
      input.fills = [{ type: "SOLID", color: { r: 0.7, g: 0.7, b: 0.7 } }];
      input.x = 16;
      input.y = 28;
      componentFrame.appendChild(input);
    } else if (componentName.includes("button")) {
      componentFrame.resize(120, 40);
      componentFrame.cornerRadius = 20;
      if (componentName.includes("filled")) {
        componentFrame.fills = [{ type: "SOLID", color: primaryColor }];
        const buttonText = figma.createText();
        buttonText.fontName = { family: "Inter", style: "Medium" };
        buttonText.fontSize = 14;
        buttonText.characters = "Button";
        buttonText.fills = [{ type: "SOLID", color: surfaceColor }];
        buttonText.x = 35;
        buttonText.y = 11;
        componentFrame.appendChild(buttonText);
      } else if (componentName.includes("outlined")) {
        componentFrame.fills = [];
        componentFrame.strokes = [{ type: "SOLID", color: primaryColor }];
        componentFrame.strokeWeight = 1;
        const buttonText = figma.createText();
        buttonText.fontName = { family: "Inter", style: "Medium" };
        buttonText.fontSize = 14;
        buttonText.characters = "Button";
        buttonText.fills = [{ type: "SOLID", color: primaryColor }];
        buttonText.x = 35;
        buttonText.y = 11;
        componentFrame.appendChild(buttonText);
      } else {
        componentFrame.fills = [];
        const buttonText = figma.createText();
        buttonText.fontName = { family: "Inter", style: "Medium" };
        buttonText.fontSize = 14;
        buttonText.characters = "Button";
        buttonText.fills = [{ type: "SOLID", color: primaryColor }];
        buttonText.x = 35;
        buttonText.y = 11;
        componentFrame.appendChild(buttonText);
      }
    } else if (componentName.includes("checkbox")) {
      componentFrame.resize(200, 24);
      componentFrame.fills = [];
      const checkbox = figma.createRectangle();
      checkbox.resize(18, 18);
      checkbox.y = 3;
      checkbox.fills = [];
      checkbox.strokes = [{ type: "SOLID", color: onSurfaceColor }];
      checkbox.strokeWeight = 2;
      checkbox.cornerRadius = 2;
      componentFrame.appendChild(checkbox);
      const label = figma.createText();
      label.fontName = { family: "Inter", style: "Regular" };
      label.fontSize = 14;
      label.characters = "Checkbox label";
      label.fills = [{ type: "SOLID", color: onSurfaceColor }];
      label.x = 28;
      label.y = 3;
      componentFrame.appendChild(label);
    } else if (componentName.includes("list")) {
      componentFrame.resize(280, componentName.includes("list-item") ? 56 : 168);
      componentFrame.fills = [{ type: "SOLID", color: surfaceColor }];
      componentFrame.strokes = [{ type: "SOLID", color: { r: 0.9, g: 0.9, b: 0.9 } }];
      componentFrame.strokeWeight = 1;
      const itemCount = componentName.includes("list-item") ? 1 : 3;
      for (let i = 0; i < itemCount; i++) {
        const listItem = figma.createFrame();
        listItem.resize(280, 56);
        listItem.y = i * 56;
        listItem.fills = [];
        const itemText = figma.createText();
        itemText.fontName = { family: "Inter", style: "Regular" };
        itemText.fontSize = 14;
        itemText.characters = `List item ${i + 1}`;
        itemText.fills = [{ type: "SOLID", color: onSurfaceColor }];
        itemText.x = 16;
        itemText.y = 18;
        listItem.appendChild(itemText);
        if (i < itemCount - 1) {
          const divider = figma.createLine();
          divider.resize(280, 0);
          divider.y = 55;
          divider.strokes = [{ type: "SOLID", color: { r: 0.9, g: 0.9, b: 0.9 } }];
          divider.strokeWeight = 1;
          listItem.appendChild(divider);
        }
        componentFrame.appendChild(listItem);
      }
    } else if (componentName.includes("expansion") || componentName.includes("accordion")) {
      componentFrame.resize(280, 120);
      componentFrame.fills = [{ type: "SOLID", color: surfaceColor }];
      componentFrame.strokes = [{ type: "SOLID", color: { r: 0.9, g: 0.9, b: 0.9 } }];
      componentFrame.strokeWeight = 1;
      componentFrame.cornerRadius = 4;
      const header = figma.createFrame();
      header.resize(280, 48);
      header.fills = [];
      componentFrame.appendChild(header);
      const headerText = figma.createText();
      headerText.fontName = { family: "Inter", style: "Medium" };
      headerText.fontSize = 14;
      headerText.characters = "Expansion Panel Header";
      headerText.fills = [{ type: "SOLID", color: onSurfaceColor }];
      headerText.x = 16;
      headerText.y = 14;
      header.appendChild(headerText);
      const chevron = figma.createPolygon();
      chevron.resize(12, 8);
      chevron.x = 250;
      chevron.y = 20;
      chevron.fills = [{ type: "SOLID", color: { r: 0.5, g: 0.5, b: 0.5 } }];
      header.appendChild(chevron);
      const content = figma.createText();
      content.fontName = { family: "Inter", style: "Regular" };
      content.fontSize = 12;
      content.characters = "Panel content goes here...";
      content.fills = [{ type: "SOLID", color: { r: 0.6, g: 0.6, b: 0.6 } }];
      content.x = 16;
      content.y = 64;
      componentFrame.appendChild(content);
    } else if (componentName.includes("card")) {
      componentFrame.resize(280, 160);
      componentFrame.fills = [{ type: "SOLID", color: surfaceColor }];
      componentFrame.cornerRadius = 12;
      componentFrame.effects = [{
        type: "DROP_SHADOW",
        color: { r: 0, g: 0, b: 0, a: 0.1 },
        offset: { x: 0, y: 2 },
        radius: 8,
        visible: true,
        blendMode: "NORMAL"
      }];
      const cardTitle = figma.createText();
      cardTitle.fontName = { family: "Inter", style: "Medium" };
      cardTitle.fontSize = 16;
      cardTitle.characters = "Card Title";
      cardTitle.fills = [{ type: "SOLID", color: onSurfaceColor }];
      cardTitle.x = 16;
      cardTitle.y = 16;
      componentFrame.appendChild(cardTitle);
      const cardContent = figma.createText();
      cardContent.fontName = { family: "Inter", style: "Regular" };
      cardContent.fontSize = 14;
      cardContent.characters = "Card content and\nadditional details...";
      cardContent.fills = [{ type: "SOLID", color: { r: 0.5, g: 0.5, b: 0.5 } }];
      cardContent.x = 16;
      cardContent.y = 48;
      componentFrame.appendChild(cardContent);
    } else {
      componentFrame.resize(280, 56);
      componentFrame.fills = [{ type: "SOLID", color: { r: 0.95, g: 0.95, b: 0.95 } }];
      componentFrame.strokes = [{ type: "SOLID", color: outlineColor }];
      componentFrame.strokeWeight = 1;
      componentFrame.strokeAlign = "INSIDE";
      componentFrame.cornerRadius = 4;
      const placeholderText = figma.createText();
      placeholderText.fontName = { family: "Inter", style: "Regular" };
      placeholderText.fontSize = 12;
      placeholderText.characters = componentName;
      placeholderText.fills = [{ type: "SOLID", color: { r: 0.5, g: 0.5, b: 0.5 } }];
      placeholderText.x = 16;
      placeholderText.y = 20;
      componentFrame.appendChild(placeholderText);
    }
    return componentFrame;
  }
  async function insertComponentScaffold(patternName, components) {
    const selection = figma.currentPage.selection;
    if (selection.length === 0) {
      figma.notify("\u26A0\uFE0F Please select a frame first to position the scaffold");
      return;
    }
    const baseNode = selection[0];
    const startX = baseNode.x;
    const startY = baseNode.y + baseNode.height + 50;
    console.log("[Plugin] Inserting scaffold for pattern:", patternName);
    console.log("[Plugin] Components:", components);
    const container = figma.createFrame();
    container.name = `Pattern Scaffold: ${patternName}`;
    container.x = startX;
    container.y = startY;
    container.fills = [{ type: "SOLID", color: { r: 0.98, g: 0.98, b: 0.98 } }];
    container.cornerRadius = 8;
    container.layoutMode = "VERTICAL";
    container.paddingLeft = 16;
    container.paddingRight = 16;
    container.paddingTop = 16;
    container.paddingBottom = 16;
    container.itemSpacing = 16;
    await figma.loadFontAsync({ family: "Inter", style: "Bold" });
    const title = figma.createText();
    title.fontName = { family: "Inter", style: "Bold" };
    title.fontSize = 16;
    title.characters = patternName;
    title.fills = [{ type: "SOLID", color: { r: 0.2, g: 0.2, b: 0.2 } }];
    container.appendChild(title);
    for (const componentName of components) {
      const componentVisual = await createComponentVisual(componentName, 0);
      container.appendChild(componentVisual);
    }
    container.resize(312, container.height);
    figma.notify(`\u2705 Inserted scaffold: ${patternName} with ${components.length} component mockups`);
  }
  figma.ui.onmessage = async (msg) => {
    console.log("[Plugin] Received message:", msg.type);
    if (msg.type === "capture-selection") {
      const snapshot = buildFrameSnapshot();
      figma.ui.postMessage({
        type: "selection-captured",
        snapshot
      });
    }
    if (msg.type === "insert-notes") {
      await insertCanvasNotes(msg.notes);
    }
    if (msg.type === "insert-scaffold") {
      await insertComponentScaffold(msg.patternName, msg.components);
    }
    if (msg.type === "close") {
      figma.closePlugin();
    }
  };
  figma.ui.on("message", (msg) => {
    console.log("[Plugin] Received UI ready signal");
  });
  function sendSelectionToUI() {
    console.log("[Plugin] Capturing current selection...");
    const snapshot = buildFrameSnapshot();
    console.log("[Plugin] Snapshot built:", snapshot ? "has data" : "null");
    figma.ui.postMessage({
      type: "selection-captured",
      snapshot
    });
    console.log("[Plugin] Selection message sent to UI");
  }
  setTimeout(() => {
    sendSelectionToUI();
  }, 500);
  figma.on("selectionchange", () => {
    console.log("[Plugin] Selection changed, updating UI...");
    sendSelectionToUI();
  });
})();
