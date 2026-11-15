/**
 * Bundle Script: Generates a single standalone HTML file (piedibus.html)
 * Designed specifically for sharing via Google Drive to Android phones.
 * Can be opened directly via file:// in Chrome / Android HTML Viewer with ZERO CORS issues.
 */

import fs from 'fs';
import path from 'path';

const projectDir = process.cwd();

const htmlTemplate = fs.readFileSync(path.join(projectDir, 'index.html'), 'utf-8');
const cssContent = fs.readFileSync(path.join(projectDir, 'css', 'styles.css'), 'utf-8');
const solverContent = fs.readFileSync(path.join(projectDir, 'js', 'solver.js'), 'utf-8');
const storeContent = fs.readFileSync(path.join(projectDir, 'js', 'store.js'), 'utf-8');
const waContent = fs.readFileSync(path.join(projectDir, 'js', 'whatsapp.js'), 'utf-8');
const appContent = fs.readFileSync(path.join(projectDir, 'js', 'app.js'), 'utf-8');

// Strip ES module import/export keywords so they can run inline safely in any browser
function cleanModule(code) {
  return code
    .replace(/^import\s+.*?from\s+['"].*?['"];?\s*$/gm, '')
    .replace(/^export\s+(const|let|var|function|class)\s+/gm, '$1 ')
    .replace(/^export\s+default\s+/gm, '')
    .replace(/^export\s*\{[^}]*\};?\s*$/gm, '');
}

const combinedJs = `
(function() {
  'use strict';

  // --- SOLVER ENGINE ---
  ${cleanModule(solverContent)}

  // --- STORE ENGINE ---
  ${cleanModule(storeContent)}

  // --- WHATSAPP UTILITIES ---
  ${cleanModule(waContent)}

  // --- APP CONTROLLER ---
  ${cleanModule(appContent)}
})();
`;

// Replace external CSS and JS links with inlined code
let bundledHtml = htmlTemplate
  .replace('<link rel="stylesheet" href="css/styles.css">', `<style>\n${cssContent}\n</style>`)
  .replace('<script type="module" src="js/app.js"></script>', `<script>\n${combinedJs}\n</script>`);

fs.writeFileSync(path.join(projectDir, 'piedibus.html'), bundledHtml, 'utf-8');
console.log('Successfully generated self-contained standalone file: piedibus.html');
