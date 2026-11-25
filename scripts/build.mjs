// Clean static build: bundles pinned Three.js locally, writes build-info.json with deployed SHA.
import { writeFileSync, mkdirSync, cpSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';

let sha = 'unknown';
try { sha = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim(); } catch {}

mkdirSync('vendor/three', { recursive: true });
const threeSrc = 'node_modules/three/build/three.module.js';
if (existsSync(threeSrc)) {
  cpSync(threeSrc, 'vendor/three/three.module.js');
}

mkdirSync('dist', { recursive: true });
cpSync('index.html', 'dist/index.html');
cpSync('styles.css', 'dist/styles.css');
cpSync('src', 'dist/src', { recursive: true });
cpSync('vendor', 'dist/vendor', { recursive: true });

const info = { sha, builtAt: new Date().toISOString(), duration: 90, arms: 12 };
writeFileSync('dist/build-info.json', JSON.stringify(info, null, 2));
writeFileSync('build-info.json', JSON.stringify(info, null, 2));
console.log('build-info', sha);
