const { spawn } = require('child_process');
const { existsSync, symlinkSync } = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const docsDir = path.resolve(root, 'docs-site');
const rootModules = path.resolve(root, 'node_modules');
const docsModules = path.resolve(docsDir, 'node_modules');

// Symlink root node_modules into docs-site so Docusaurus resolves deps
if (!existsSync(docsModules)) {
  console.log('[start-docs] Symlinking node_modules into docs-site/');
  try {
    symlinkSync(rootModules, docsModules, 'dir');
  } catch (err) {
    console.error('[start-docs] Symlink failed:', err.message);
    process.exit(1);
  }
}

// Find the docusaurus binary
const docusaurusBin = path.resolve(rootModules, '.bin', 'docusaurus');

console.log('[start-docs] Launching Docusaurus from', docsDir);

const child = spawn(
  docusaurusBin,
  ['start', '--port', '3000', '--host', '0.0.0.0'],
  {
    cwd: docsDir,
    stdio: 'inherit',
    env: { ...process.env, NODE_PATH: rootModules },
  }
);

child.on('error', (err) => {
  console.error('[start-docs] Failed to start Docusaurus:', err.message);
  process.exit(1);
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});
