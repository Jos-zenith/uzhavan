const fs = require('fs');
const path = require('path');

const appRoot = process.cwd();
const args = process.argv.slice(2);
const verifyOnly = args.includes('--verify');

function hasPath(relativePath) {
  return fs.existsSync(path.join(appRoot, relativePath));
}

function parseMajor(versionString) {
  const clean = String(versionString || '').replace(/^v/, '');
  const major = Number(clean.split('.')[0]);
  return Number.isFinite(major) ? major : 0;
}

function checkNodeVersion() {
  const major = parseMajor(process.version);
  const ok = major >= 18;
  return {
    key: 'Node.js Version',
    ok,
    message: `Detected ${process.version}. Required: >= 18.x`,
  };
}

function checkWorkspaceShape() {
  const required = [
    'package.json',
    'src',
    'src/sdk',
    'src/index.tsx',
    'src/App.tsx',
    'SDK_FRAMEWORK.md',
    'data/uzhavan.xlsx',
    'data/Farms Stock Report.xlsx',
    'data/tn_fertilizer_stock.csv',
  ];

  const missing = required.filter((entry) => !hasPath(entry));
  return {
    key: 'Workspace Structure',
    ok: missing.length === 0,
    message:
      missing.length === 0
        ? 'Required project files are present.'
        : `Missing: ${missing.join(', ')}`,
  };
}

function checkNodeModules() {
  const ok = hasPath('node_modules');
  return {
    key: 'Dependencies Installed',
    ok,
    message: ok
      ? 'node_modules found.'
      : 'node_modules not found. Run: npm install',
  };
}

function checkSdkCore() {
  const required = [
    'src/sdk/types.ts',
    'src/sdk/provider.tsx',
    'src/sdk/telemetry.ts',
    'src/sdk/roi.ts',
    'src/sdk/governance.ts',
    'src/sdk/process.ts',
    'src/sdk/experimentation.ts',
    'src/sdk/attribution.ts',
  ];

  const missing = required.filter((entry) => !hasPath(entry));
  return {
    key: 'SDK Core Layer',
    ok: missing.length === 0,
    message:
      missing.length === 0
        ? 'SDK modules are wired.'
        : `Missing SDK modules: ${missing.join(', ')}`,
  };
}

function checkDocumentationStructure() {
  const required = [
    'README.md',
    'docs/INDEX.md',
    'docs/INSTALLATION.md',
    'SDK_FRAMEWORK.md',
    'POLICY_ENFORCEMENT_IMPLEMENTATION.md',
    'POLICY_FIRST_MIGRATION.md',
  ];

  const missing = required.filter((entry) => !hasPath(entry));
  return {
    key: 'Documentation Structure',
    ok: missing.length === 0,
    message:
      missing.length === 0
        ? 'Core documentation files are present.'
        : `Missing docs: ${missing.join(', ')}`,
  };
}

function printResult(result) {
  const status = result.ok ? 'PASS' : 'FAIL';
  console.log(`[${status}] ${result.key}`);
  console.log(`       ${result.message}`);
}

function main() {
  const checks = [
    checkNodeVersion(),
    checkWorkspaceShape(),
    checkNodeModules(),
    checkSdkCore(),
    checkDocumentationStructure(),
  ];

  console.log('TN Digital Agriculture SDK - Project Setup Check');
  console.log('=================================================');

  checks.forEach(printResult);

  const failed = checks.filter((item) => !item.ok);

  if (failed.length === 0) {
    console.log('\nSetup verification complete. Project is ready.');
    if (!verifyOnly) {
      console.log('Run: npm start');
    }
    process.exit(0);
  }

  console.log('\nSetup verification failed. Resolve items above and re-run: npm run setup:verify');
  process.exit(1);
}

main();

