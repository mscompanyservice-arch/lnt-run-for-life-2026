import { build } from '/home/claude/edgebuild/node_modules/esbuild/lib/main.js';
import fs from 'node:fs';
import path from 'node:path';
const root = new URL('..', import.meta.url).pathname;
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const assets = {};
const add = (name, file) => {
  const ext = path.extname(file);
  const buf = fs.readFileSync(file);
  assets[name] = ext === '.woff2' ? { type: types[ext], b64: buf.toString('base64') } : { type: types[ext], text: buf.toString('utf8') };
};
for (const f of ['index.html', 'register.html', 'status.html', 'admin.html']) add(f, path.join(root, 'public', f));
for (const f of fs.readdirSync(path.join(root, 'public/static'))) add('static/' + f, path.join(root, 'public/static', f));
const fontDir = path.join(root, 'node_modules/@fontsource/noto-sans-lao/files');
for (const w of ['400', '700']) add(`fonts/noto-sans-lao-lao-${w}-normal.woff2`, path.join(fontDir, `noto-sans-lao-lao-${w}-normal.woff2`));
fs.writeFileSync(path.join(root, 'edge/assets.generated.js'), 'export default ' + JSON.stringify(assets) + ';\n');

const extPlugin = {
  name: 'ext',
  setup(b) {
    b.onResolve({ filter: /^(express|pg|crypto|fs|path|readline)$/ }, (a) => ({ path: a.path, namespace: 'ext' }));
    b.onLoad({ filter: /.*/, namespace: 'ext' }, (a) => ({ contents: `module.exports = globalThis.__lntExt[${JSON.stringify(a.path)}];`, loader: 'js' }));
    b.onResolve({ filter: /^(npm|node):/ }, (a) => ({ path: a.path, external: true }));
  },
};
await build({
  entryPoints: [path.join(root, 'edge/entry.mjs')], bundle: true, format: 'esm', platform: 'neutral', target: 'es2022',
  outfile: path.join(root, 'edge/dist/app.js'), plugins: [extPlugin], minify: true, legalComments: 'none', charset: 'utf8',
});
console.log('built', fs.statSync(path.join(root, 'edge/dist/app.js')).size, 'bytes');
