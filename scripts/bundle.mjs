// Build-time helper: packs the full project into public/aquabeat-v12-source.json
// so the in-app "Download Source Code" button can fetch a complete bundle.
// Runs automatically before `dev` and `build` (see package.json pre-scripts).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const files = [
  'package.json', 'next.config.js', 'tailwind.config.js', 'postcss.config.js',
  'tsconfig.json', 'src/app/layout.tsx', 'src/app/globals.css', 'src/app/page.tsx',
  'scripts/bundle.mjs', 'README.md',
];
const bundle = {};
for (const f of files) {
  try { bundle[f] = readFileSync(join(root, f), 'utf8'); } catch { /* skip missing */ }
}
mkdirSync(join(root, 'public'), { recursive: true });
writeFileSync(join(root, 'public', 'aquabeat-v12-source.json'), JSON.stringify(bundle, null, 2));
console.log(`[aquabeat] source bundle written: ${Object.keys(bundle).length} files`);
