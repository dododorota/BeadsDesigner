// Składa aplikację w jeden plik HTML (dist/beads-designer.html): skrypty w jednej
// paczce, style w środku. Taki plik można otworzyć bez serwera albo opublikować.
import { build } from 'esbuild';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const artifact = process.argv.includes('--artifact');

const vendor = {
  name: 'vendor-three',
  setup(b) {
    b.onResolve({ filter: /^three$/ }, () => ({ path: path.join(root, 'vendor/three.module.min.js') }));
    b.onResolve({ filter: /^three\/addons\// }, (a) => ({ path: path.join(root, 'vendor', a.path.slice('three/addons/'.length)) }));
  },
};

const bundle = await build({
  entryPoints: [path.join(root, 'js/main.js')],
  bundle: true,
  write: false,
  format: 'iife',
  minify: true,
  target: 'es2020',
  plugins: [vendor],
  legalComments: 'none',
});
const js = bundle.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const css = await readFile(path.join(root, 'css/style.css'), 'utf8');
const html = await readFile(path.join(root, 'index.html'), 'utf8');
const app = html.slice(html.indexOf('<!--APP-->') + 10, html.indexOf('<!--/APP-->'));
const title = html.match(/<title>.*?<\/title>/)[0];
const fonts = html.match(/<link rel="stylesheet" href="https:\/\/fonts[^>]+>/)[0];

const body = `${title}
${fonts}
<style>
${css}</style>
${app}
<script>window.BEADS_ARTIFACT = ${artifact};</script>
<script>
${js}</script>
`;
// Wersja do publikacji jako Artifact nie ma własnego szkieletu dokumentu.
const out = artifact
  ? body
  : `<!doctype html>\n<html lang="pl">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n${body.replace(app, '</head>\n<body>' + app)}</body>\n</html>\n`;
await mkdir(path.join(root, 'dist'), { recursive: true });
const file = path.join(root, 'dist', artifact ? 'beads-designer-artifact.html' : 'beads-designer.html');
await writeFile(file, out);
console.log(`${path.relative(root, file)}: ${(out.length / 1024).toFixed(0)} KB`);
