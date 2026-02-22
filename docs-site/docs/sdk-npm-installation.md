---
id: sdk-npm-installation
title: SDK npm Installation
slug: /sdk-npm-installation
---

# SDK npm Installation

This guide shows how to make your SDK installable like:

```bash
npm install @victori/sdk
```

## 1) Prepare package metadata

Add or update your SDK package metadata (recommended in a dedicated SDK package):

```json
{
  "name": "@victori/sdk",
  "version": "1.0.0",
  "description": "VICT offline-first telemetry and governance SDK",
  "license": "MIT",
  "type": "module",
  "main": "dist/index.cjs",
  "module": "dist/index.js",
  "types": "dist/index.d.ts",
  "files": ["dist"],
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    }
  },
  "sideEffects": false,
  "publishConfig": {
    "access": "public"
  }
}
```

## 2) Build the SDK bundle

Use a build tool (`tsup` recommended) to produce `dist/` with ESM, CJS, and types.

Example scripts:

```json
{
  "scripts": {
    "build": "tsup src/index.ts --format esm,cjs --dts --clean",
    "prepublishOnly": "npm run build"
  }
}
```

## 3) Publish to npm

```bash
npm login
npm publish --access public
```

For scoped private packages:

```bash
npm publish --access restricted
```

## 4) Install and use

```bash
npm install @victori/sdk
```

```ts
import { OfflineAgriSdkProvider } from '@victori/sdk';
```

## 5) Version updates

```bash
npm version patch   # or minor / major
npm publish
```

## Recommended structure

Use a dedicated package for npm publishing (for example `packages/vict-sdk`) so app-only dependencies and build settings stay separate from SDK distribution.