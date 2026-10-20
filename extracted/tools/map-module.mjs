// What a module is made of: every top-level declaration, its lines, and which of the module's own
// declarations it reads — the map a split is planned from (tools/move-out.mjs does the move).
//   node tools/map-module.mjs src/systems/career/release.js
import { parseAst } from 'rolldown/parseAst';
import fs from 'fs';
const file = process.argv[2];
const src = fs.readFileSync(file, 'utf8');
const ast = parseAst(src, { lang: 'jsx' }, file);
const line = (pos) => src.slice(0, pos).split('\n').length;
const declOf = (n) => (n.type === 'ExportNamedDeclaration' ? n.declaration : n);
const names = (n) => { const d = declOf(n); if (!d) return []; if (d.type === 'FunctionDeclaration') return [d.id.name]; if (d.type === 'VariableDeclaration') return d.declarations.map((x) => x.id.name); return []; };
const local = new Set(ast.body.flatMap(names));
function refs(node) { const out = new Set(); const walk = (x, p, k) => { if (!x || typeof x !== 'object') return; if (Array.isArray(x)) { for (const y of x) walk(y, p, k); return; }
  if (x.type === 'Identifier') { const skip = p && ((p.type === 'MemberExpression' && k === 'property' && !p.computed) || (p.type === 'Property' && k === 'key' && !p.computed && !p.shorthand)); if (!skip) out.add(x.name); }
  for (const kk of Object.keys(x)) if (kk !== 'start' && kk !== 'end' && kk !== 'type') walk(x[kk], x, kk); }; walk(node, null, null); return out; }
for (const n of ast.body) {
  if (n.type === 'ImportDeclaration') continue;
  const nm = names(n); if (!nm.length) { console.log(`L${line(n.start)} (statement ${n.type})`); continue; }
  const uses = [...refs(n)].filter((r) => local.has(r) && !nm.includes(r));
  console.log(`L${line(n.start)}-${line(n.end)} ${n.type === 'ExportNamedDeclaration' ? 'export ' : ''}${nm.join(',')}${uses.length ? '  → ' + uses.join(',') : ''}`);
}
