import fs from 'node:fs';
import path from 'node:path';

let cached: Buffer | null = null;

// Loads Inter Bold once and caches it. Used by the icon/apple-icon/PWA
// generators so the K shape matches the rest of the brand instead of
// falling back to whatever Satori would pick on its own.
export function loadInterBold(): Buffer {
  if (cached) return cached;
  cached = fs.readFileSync(path.join(process.cwd(), 'src/app/fonts/Inter-Bold.woff'));
  return cached;
}
