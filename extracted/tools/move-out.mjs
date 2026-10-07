// Move top-level declarations out of src/App.jsx into a new module, by AST ranges — never by
// brace-walking, which once deleted an exported handler with a green build. This is what took
// Wave 1 out of App.jsx; Wave 2 is the same command. From extracted/:
//
//   node tools/move-out.mjs ui/components/Name.jsx Name,Helper,Helper --dry   # what it would do
//   node tools/move-out.mjs ui/components/Name.jsx Name,Helper,Helper         # do it
//
// It copies each declaration with the comment block above it, byte for byte; writes the imports
// the moved code reads (paths rewritten), exports what App still uses and imports it back, and
// drops App imports nothing reads any more. It refuses when a moved piece uses something that
// stays in App — move that too, or put it in ui/helpers.js and list it in SHARED.
//
// What it cannot see is shadowing: a local `money` inside a moved function looks like a use of
// the import. The result is an unused import, and `npx oxlint` says so. After every move:
// build-singlefile, oxlint (no-undef is on, so a missing import is an error), test_screens.
// Read the comment above each moved function — comments drift in a 3,000-line file, and five
// had drifted onto the wrong component in Wave 1.
import { parseAst } from 'rolldown/parseAst';
import fs from 'fs';
import path from 'path';

const SRC = path.resolve('src');
const APP = path.join(SRC, 'App.jsx');
const [outRel, namesArg, ...flags] = process.argv.slice(2);
const dry = flags.includes('--dry');
const names = namesArg.split(',').map((x) => x.trim()).filter(Boolean);
const OUT = path.join(SRC, outRel);

// Things App.jsx keeps defining for itself that moved code may also use: name -> module under src/.
const SHARED = {
  allSets: 'ui/helpers.js',
  money: 'ui/helpers.js',
  isMinor: 'systems/meta/legacy.js',
};

const src = fs.readFileSync(APP, 'utf8');
const ast = parseAst(src, { lang: 'jsx' }, 'App.jsx');

function declOf(n) { return (n.type === 'ExportNamedDeclaration' || n.type === 'ExportDefaultDeclaration') ? n.declaration : n; }
function declNames(n) {
  const d = declOf(n); if (!d) return [];
  if (d.type === 'FunctionDeclaration') return [d.id.name];
  if (d.type === 'VariableDeclaration') return d.declarations.map((x) => x.id.name);
  return [];
}
function refs(node) {
  const out = new Set();
  const walk = (x, parent, key) => {
    if (!x || typeof x !== 'object') return;
    if (Array.isArray(x)) { for (const y of x) walk(y, parent, key); return; }
    if (x.type === 'Identifier' || x.type === 'JSXIdentifier') {
      const skip = parent && ((parent.type === 'MemberExpression' && key === 'property' && !parent.computed)
        || (parent.type === 'Property' && key === 'key' && !parent.computed && !parent.shorthand)
        || (parent.type === 'JSXAttribute' && key === 'name')
        || (parent.type === 'JSXMemberExpression' && key === 'property')
        || (parent.type === 'MethodDefinition' && key === 'key'));
      if (!skip) out.add(x.name);
    }
    for (const k of Object.keys(x)) if (k !== 'start' && k !== 'end' && k !== 'type') walk(x[k], x, k);
  };
  walk(node, null, null);
  return out;
}

// imports: local name -> { source, imported | 'default' | '*' }
const imports = new Map();
const local = new Map();   // name -> node
for (const n of ast.body) {
  if (n.type === 'ImportDeclaration') {
    for (const sp of n.specifiers) {
      const imported = sp.type === 'ImportDefaultSpecifier' ? 'default' : sp.type === 'ImportNamespaceSpecifier' ? '*' : (sp.imported.name || sp.imported.value);
      imports.set(sp.local.name, { source: n.source.value, imported });
    }
  } else for (const nm of declNames(n)) local.set(nm, n);
}

// A node's region: from the line after the previous node's end to the end of its own line.
const idx = new Map(ast.body.map((n, i) => [n, i]));
function region(n) {
  const i = idx.get(n);
  let a = 0;
  if (i > 0) { const pe = ast.body[i - 1].end; const nl = src.indexOf('\n', pe); a = nl < 0 ? pe : nl + 1; }
  let b = src.indexOf('\n', n.end); b = b < 0 ? src.length : b + 1;
  // The node must be the only thing that starts on its last line.
  const next = ast.body[i + 1];
  if (next && next.start < b) throw new Error(`${declNames(n)} shares its last line with the next statement`);
  return [a, b];
}

const moving = new Set();
for (const nm of names) {
  const n = local.get(nm);
  if (!n) throw new Error(`no top-level ${nm} in App.jsx`);
  for (const other of declNames(n)) if (!names.includes(other)) throw new Error(`${nm} is declared together with ${other}`);
  moving.add(n);
}
const movingNodes = [...moving].sort((x, y) => x.start - y.start);
const movingNames = new Set(movingNodes.flatMap(declNames));

// What the moved code needs.
const needImports = new Map();   // source -> Map(imported -> local)
const problems = [];
const addImport = (source, imported, localName) => {
  if (!needImports.has(source)) needImports.set(source, new Map());
  needImports.get(source).set(imported, localName);
};
for (const n of movingNodes) for (const r of refs(n)) {
  if (movingNames.has(r)) continue;
  if (SHARED[r] && !movingNames.has(r)) { addImport('@/' + SHARED[r], r, r); continue; }
  if (imports.has(r)) { const im = imports.get(r); addImport(im.source, im.imported, r); continue; }
  if (local.has(r)) problems.push(`${declNames(n)} uses App-local ${r}`);
}
if (problems.length) { console.log('BLOCKED\n  ' + [...new Set(problems)].join('\n  ')); process.exit(1); }

// What stays behind and still uses moved names -> those get exported.
const staying = ast.body.filter((n) => !moving.has(n) && n.type !== 'ImportDeclaration');
const usedByApp = new Set();
for (const n of staying) for (const r of refs(n)) if (movingNames.has(r)) usedByApp.add(r);

// Rewrite an import source (relative to src/App.jsx, or '@/x' meaning src/x) for the new file.
const outDir = path.dirname(OUT);
function rel(source) {
  let abs;
  if (source.startsWith('@/')) abs = path.join(SRC, source.slice(2));
  else if (source.startsWith('.')) abs = path.resolve(SRC, source);
  else return source;
  let r = path.relative(outDir, abs).split(path.sep).join('/');
  if (!r.startsWith('.')) r = './' + r;
  return r;
}
function importLine(source, specs, wrap = 110) {
  let def = null, ns = null; const named = [];
  for (const [imported, l] of specs) {
    if (imported === 'default') def = l; else if (imported === '*') ns = l;
    else named.push(imported === l ? l : `${imported} as ${l}`);
  }
  const parts = [];
  if (def) parts.push(def);
  if (ns) parts.push(`* as ${ns}`);
  if (named.length) {
    const one = `{ ${named.join(', ')} }`;
    if ((`import ${[...parts, one].join(', ')} from '${source}';`).length <= wrap) parts.push(one);
    else {
      const lines = []; let cur = '';
      for (const nm of named) {
        const add = cur ? `${cur}, ${nm}` : nm;
        if (add.length > wrap - 12 && cur) { lines.push(cur + ','); cur = nm; } else cur = add;
      }
      lines.push(cur);
      parts.push(`{ ${lines.join('\n  ')} }`);
    }
  }
  return `import ${parts.join(', ')} from '${source}';`;
}

// ── the new file ────────────────────────────────────────────────────────────
// react, packages, state, engine, systems, phone, ui, sibling components — in that order.
const rank = (s) => s === 'react' ? 0 : !s.startsWith('.') ? 1 : /\/state\//.test(s) ? 2 : /\/engine\//.test(s) ? 3
  : /\/systems\//.test(s) ? 4 : /\/phone\//.test(s) ? 5 : s.startsWith('../') ? 6 : 7;
const order = [...needImports.keys()].map((s) => [s, rel(s)]).sort((a, b) => rank(a[1]) - rank(b[1]));
const header = order.map(([s, r]) => importLine(r, [...needImports.get(s)])).join('\n');
let body = '';
for (const n of movingNodes) {
  const [a, b] = region(n);
  let text = src.slice(a, b);
  const nm = declNames(n);
  if (n.type !== 'ExportNamedDeclaration' && nm.some((x) => usedByApp.has(x))) {
    const off = n.start - a;
    text = text.slice(0, off) + 'export ' + text.slice(off);
  }
  body += text;
}
const outText = header + '\n\n' + body.replace(/^\n+/, '');

// ── App.jsx, without them ───────────────────────────────────────────────────
const cuts = movingNodes.map(region).sort((x, y) => y[0] - x[0]);
let app = src;
for (const [a, b] of cuts) app = app.slice(0, a) + app.slice(b);

// Import the moved names App still uses, after the last import declaration.
const appRel = (() => { let r = path.relative(SRC, OUT).split(path.sep).join('/'); return r.startsWith('.') ? r : './' + r; })();
const exportedList = [...usedByApp].sort((a, b) => a.localeCompare(b));
if (exportedList.length) {
  const a2 = parseAst(app, { lang: 'jsx' }, 'App.jsx');
  const lastImp = [...a2.body].reverse().find((n) => n.type === 'ImportDeclaration');
  const at = app.indexOf('\n', lastImp.end) + 1;
  app = app.slice(0, at) + importLine(appRel, exportedList.map((x) => [x, x])) + '\n' + app.slice(at);
}

// Drop App imports nothing in App reads any more.
{
  const a3 = parseAst(app, { lang: 'jsx' }, 'App.jsx');
  const used = new Set();
  for (const n of a3.body) if (n.type !== 'ImportDeclaration') for (const r of refs(n)) used.add(r);
  const edits = [];
  for (const n of a3.body) {
    if (n.type !== 'ImportDeclaration' || !n.specifiers.length) continue;
    const keep = n.specifiers.filter((sp) => used.has(sp.local.name));
    if (keep.length === n.specifiers.length) continue;
    let b = app.indexOf('\n', n.end); b = b < 0 ? app.length : b + 1;
    if (!keep.length) { edits.push([n.start, b, '']); continue; }
    const specs = keep.map((sp) => [sp.type === 'ImportDefaultSpecifier' ? 'default' : sp.type === 'ImportNamespaceSpecifier' ? '*' : (sp.imported.name || sp.imported.value), sp.local.name]);
    edits.push([n.start, b, importLine(n.source.value, specs) + '\n']);
  }
  for (const [a, b, t] of edits.sort((x, y) => y[0] - x[0])) app = app.slice(0, a) + t + app.slice(b);
}
// Shared helpers that left App entirely are no longer App's to define if nothing in App uses them;
// that is reported, not acted on.

console.log(`moving ${[...movingNames].join(', ')}  (${body.split('\n').length - 1} lines)`);
console.log(`exported back to App: ${exportedList.join(', ') || '(none)'}`);
console.log(`App.jsx ${src.split('\n').length} -> ${app.split('\n').length} lines`);
if (dry) { console.log('\n' + header); process.exit(0); }
if (fs.existsSync(OUT)) throw new Error(`${outRel} exists already`);
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(OUT, outText);
fs.writeFileSync(APP, app);
console.log('written ' + outRel);
