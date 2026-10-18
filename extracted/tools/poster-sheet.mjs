// node tools/poster-sheet.mjs <save.json> <out.html> [label]
// Every credit in a save drawn by the real Poster, as a strip of thumbnails and large by kind
// (tools/poster-sheet/main.jsx). For judging a poster change on a real career, before and after.
import { build } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';

const [,, savePath, out, label = ''] = process.argv;
if (!savePath || !out) { console.log('usage: node tools/poster-sheet.mjs <save.json> <out.html> [label]'); process.exit(1); }
const raw = JSON.parse(fs.readFileSync(savePath, 'utf8'));
const s = raw.state || raw;
const credits = [...(s.filmography || [])].filter((c) => c && c.title);
await build({ configFile: false, plugins: [react()], logLevel: 'warn',
  build: { outDir: 'dist-sheet', target: 'es2020', minify: false, emptyOutDir: true,
    rollupOptions: { input: 'tools/poster-sheet/main.jsx', output: { format: 'iife', entryFileNames: 'sheet.js', inlineDynamicImports: true } } } });
const js = fs.readFileSync('dist-sheet/sheet.js', 'utf8');
fs.writeFileSync(out, `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Poster sheet</title>
<style>body{margin:0;background:#120e1c;color:#eee}</style></head><body><div id="root"></div>
<script>window.CREDITS=${JSON.stringify(credits)};window.LABEL=${JSON.stringify(label)};</script><script>${js.replace(/<\/script/g, '<\\/script')}</script></body></html>`);
fs.rmSync('dist-sheet', { recursive: true, force: true });
console.log('sheet:', out, credits.length, 'credits');
