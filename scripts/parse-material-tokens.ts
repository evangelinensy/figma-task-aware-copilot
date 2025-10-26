/**
 * Parse Material Design tokens from material-web SCSS files
 * and generate a JSON specification file for Figma component generation
 */

import * as fs from 'fs';
import * as path from 'path';

const MATERIAL_WEB_PATH = path.join(__dirname, '../material-web');
const TOKENS_PATH = path.join(MATERIAL_WEB_PATH, 'tokens/versions/v0_192');
const OUTPUT_PATH = path.join(__dirname, '../backend/mappings/material-design-specs.json');

interface ColorPalette {
  [key: string]: string;
}

interface ComponentSpec {
  name: string;
  type: string;
  tokens: {
    [key: string]: string | number;
  };
}

/**
 * Parse SCSS color palette
 */
function parseColorPalette(scssContent: string): ColorPalette {
  const palette: ColorPalette = {};

  // Match lines like: 'primary40': if($exclude-hardcoded-values, null, #6750a4),
  const colorRegex = /'([^']+)':\s*if\([^,]+,\s*null,\s*(#[0-9a-fA-F]{3,6})\)/g;

  let match;
  while ((match = colorRegex.exec(scssContent)) !== null) {
    palette[match[1]] = match[2];
  }

  return palette;
}

/**
 * Parse component tokens
 */
function parseComponentTokens(scssContent: string, componentName: string): Record<string, any> {
  const tokens: Record<string, any> = {};

  // Match lines like: 'container-height': if($exclude-hardcoded-values, null, 40px),
  const tokenRegex = /'([^']+)':\s*if\([^,]+,\s*null,\s*([^)]+)\)/g;

  let match;
  while ((match = tokenRegex.exec(scssContent)) !== null) {
    const key = match[1];
    let value: any = match[2].trim();

    // Convert px values to numbers
    if (value.endsWith('px')) {
      value = parseFloat(value);
    }

    tokens[key] = value;
  }

  // Also capture color/elevation references
  const refRegex = /'([^']+)':\s*map\.get\(\$deps,\s*'([^']+)',\s*'([^']+)'\)/g;

  while ((match = refRegex.exec(scssContent)) !== null) {
    const key = match[1];
    const refType = match[2]; // e.g., 'md-sys-color'
    const refValue = match[3]; // e.g., 'primary'

    tokens[key] = `ref:${refType}:${refValue}`;
  }

  return tokens;
}

/**
 * Discover all components in material-web
 */
function discoverComponents(): string[] {
  const components: string[] = [];

  // Main components
  const mainDirs = fs.readdirSync(MATERIAL_WEB_PATH, { withFileTypes: true });

  for (const dir of mainDirs) {
    if (dir.isDirectory() && !dir.name.startsWith('.') && !['docs', 'catalog', 'internal', 'scripts', 'testing', 'tokens', 'migrations', 'labs', 'typography', 'color'].includes(dir.name)) {
      components.push(dir.name);
    }
  }

  // Labs components
  const labsPath = path.join(MATERIAL_WEB_PATH, 'labs');
  if (fs.existsSync(labsPath)) {
    const labsDirs = fs.readdirSync(labsPath, { withFileTypes: true });
    for (const dir of labsDirs) {
      if (dir.isDirectory() && !dir.name.startsWith('.') && !['behaviors', 'item'].includes(dir.name)) {
        components.push(`labs/${dir.name}`);
      }
    }
  }

  return components;
}

/**
 * Find token file for component
 */
function findComponentTokenFile(componentName: string): string[] {
  const files: string[] = [];

  // Check for variant-specific token files
  const variantPrefixes = ['filled', 'outlined', 'elevated', 'text', 'tonal'];

  for (const variant of variantPrefixes) {
    const fileName = `_md-comp-${variant}-${componentName}.scss`;
    const filePath = path.join(TOKENS_PATH, fileName);

    if (fs.existsSync(filePath)) {
      files.push(filePath);
    }
  }

  // Also check for base component file
  const baseFileName = `_md-comp-${componentName}.scss`;
  const baseFilePath = path.join(TOKENS_PATH, baseFileName);

  if (fs.existsSync(baseFilePath)) {
    files.push(baseFilePath);
  }

  return files;
}

/**
 * Main function
 */
async function main() {
  console.log('🔍 Parsing Material Design tokens...\n');

  // 1. Parse color palette
  console.log('📊 Parsing color palette...');
  const paletteFile = path.join(TOKENS_PATH, '_md-ref-palette.scss');
  const paletteContent = fs.readFileSync(paletteFile, 'utf-8');
  const colorPalette = parseColorPalette(paletteContent);
  console.log(`   ✅ Found ${Object.keys(colorPalette).length} colors\n`);

  // 2. Discover components
  console.log('🔍 Discovering components...');
  const components = discoverComponents();
  console.log(`   ✅ Found ${components.length} components\n`);

  // 3. Parse component specs
  console.log('📦 Parsing component specifications...');
  const componentSpecs: Record<string, ComponentSpec[]> = {};

  for (const component of components) {
    const baseName = component.replace('labs/', '');
    const tokenFiles = findComponentTokenFile(baseName);

    if (tokenFiles.length > 0) {
      componentSpecs[component] = [];

      for (const tokenFile of tokenFiles) {
        const variantName = path.basename(tokenFile).match(/_md-comp-(.+)\.scss/)?.[1] || component;
        const tokenContent = fs.readFileSync(tokenFile, 'utf-8');
        const tokens = parseComponentTokens(tokenContent, variantName);

        componentSpecs[component].push({
          name: variantName,
          type: component,
          tokens
        });

        console.log(`   ✅ ${variantName} (${Object.keys(tokens).length} tokens)`);
      }
    }
  }

  // 4. Generate output JSON
  console.log('\n💾 Writing specification file...');
  const output = {
    version: 'v0.192',
    generatedAt: new Date().toISOString(),
    colorPalette,
    components: componentSpecs
  };

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));
  console.log(`   ✅ Written to ${OUTPUT_PATH}\n`);

  console.log('✨ Done! Material Design specifications generated successfully.');
}

main().catch(console.error);
