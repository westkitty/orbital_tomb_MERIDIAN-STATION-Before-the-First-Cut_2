// Clean static build: writes build-info.json with deployed SHA. No bundler needed (static site).
import { writeFileSync, mkdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
let sha = 'unknown';
try { sha = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim(); } catch {}
mkdirSync('dist', { recursive: true });
// Copy deployable static files (index, styles, src) to dist for Pages artifact.
import { cpSync } from 'node:fs';
cpSync('index.html', 'dist/index.html');
cpSync('styles.css', 'dist/styles.css');
cpSync('src', 'dist/src', { recursive: true });
writeFileSync('dist/build-info.json', JSON.stringify({ sha, builtAt: new Date().toISOString(), duration: 90, arms: 12 }, null, 2));
writeFileSync('build-info.json', JSON.stringify({ sha, builtAt: new Date().toISOString(), duration: 90, arms: 12 }, null, 2));
console.log('build-info', sha);
