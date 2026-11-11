// Copia i file dell'app web nella cartella www/, usata da Capacitor per l'app Android.
import { cpSync, rmSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'www');
const ITEMS = ['index.html', 'manifest.webmanifest', 'sw.js', 'css', 'js', 'apps', 'icons'];

rmSync(out, { recursive: true, force: true });
mkdirSync(out);
for (const item of ITEMS) cpSync(join(root, item), join(out, item), { recursive: true });
console.log('www/ pronta');
