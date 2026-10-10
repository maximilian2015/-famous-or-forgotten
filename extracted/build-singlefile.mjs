import { build } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
// es2020 rather than es2019: every `?.` and `??` was being expanded into long-hand, and the file
// had grown just past what the Claude app will open as a page (a2e954e, 1,361,037 bytes, opened
// as source; 30ac735, 1,359,175, had opened). Two terser passes and top-level mangling take a
// little more. Any browser from the last five years runs es2020.
await build({ configFile: false, plugins: [react()], build: { outDir: 'dist-sf', target: 'es2020', minify: 'terser',
  terserOptions: { compress: { passes: 2 }, mangle: { toplevel: true }, format: { comments: false } }, emptyOutDir: true, rollupOptions: { output: { format: 'iife', inlineDynamicImports: true, entryFileNames: 'app.js', assetFileNames: 'a.[ext]' } } }, logLevel: 'error' });
const js = fs.readFileSync('dist-sf/app.js', 'utf8');
let css = ''; for (const f of fs.readdirSync('dist-sf')) if (f.endsWith('.css')) css += fs.readFileSync('dist-sf/' + f, 'utf8');
const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Famous or Forgotten</title>${css ? '<style>' + css + '</style>' : ''}</head><body><div id="root"></div><script>${js}</script></body></html>`;
fs.mkdirSync('dist', { recursive: true });
fs.writeFileSync('dist/game.html', html);
console.log('built:', (html.length / 1024 | 0) + 'KB | module:', html.includes('type="module"'));
