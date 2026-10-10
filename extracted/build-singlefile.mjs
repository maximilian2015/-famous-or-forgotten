import { build } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
// es2020 rather than es2019: every `?.` and `??` was expanded into long-hand. Two terser passes
// and top-level mangling take a little more off (about 5.5 KB). Any browser from the last five
// years runs es2020. (Made on a wrong theory — that the Claude app's file card had a size limit;
// every build sent was 1.353–1.361 MB and the card shows them all as source. Maxi plays in the
// app's browser pane, `fof-shipped` in .claude/launch.json. The smaller file is kept anyway.)
await build({ configFile: false, plugins: [react()], build: { outDir: 'dist-sf', target: 'es2020', minify: 'terser',
  terserOptions: { compress: { passes: 2 }, mangle: { toplevel: true }, format: { comments: false } }, emptyOutDir: true, rollupOptions: { output: { format: 'iife', inlineDynamicImports: true, entryFileNames: 'app.js', assetFileNames: 'a.[ext]' } } }, logLevel: 'error' });
const js = fs.readFileSync('dist-sf/app.js', 'utf8');
let css = ''; for (const f of fs.readdirSync('dist-sf')) if (f.endsWith('.css')) css += fs.readFileSync('dist-sf/' + f, 'utf8');
const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Famous or Forgotten</title>${css ? '<style>' + css + '</style>' : ''}</head><body><div id="root"></div><script>${js}</script></body></html>`;
fs.mkdirSync('dist', { recursive: true });
fs.writeFileSync('dist/game.html', html);
console.log('built:', (html.length / 1024 | 0) + 'KB | module:', html.includes('type="module"'));
