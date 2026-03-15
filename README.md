# VICT Digital Agriculture Platform (victo-sdk)

Offline-first digital agriculture platform built for Tamil Nadu workflows, with standardized telemetry, KPI governance, and ROI analytics.

Production deployment: https://victo-sdk.vercel.app

## Why This Project

Many field operations run in low-connectivity environments, and feature impact is often hard to prove due to inconsistent metrics capture.

This project solves both problems:

- Delivers farmer-facing services that continue to work with intermittent network.
- Enforces a common telemetry and KPI process so feature value can be measured consistently.
- Provides ROI-ready data and governance workflows to support evidence-based product decisions.

## Core Capabilities

- Offline-first service workflows with local persistence.
- Sync queue with retry and status tracking.
- Standardized feature instrumentation and telemetry schema.
- KPI catalog support and feature-level impact tracking.
- ROI computation layer for value and cost analysis.
- Governance checks for release readiness (measure before ship).

## Service Coverage

The app includes multiple agriculture-oriented service modules, including:

- Benefit registration support
- Fertilizer stock lookup
- Seed stock lookup
- Machinery and mechanic discovery
- Market price access
- Weather and reservoir insights
- Officer directory and service information
- Agriculture news and pest identification support

## Tech Stack

- Frontend: React 19, TypeScript, CRACO
- Cross-platform compatibility: React Native Web, Expo
- Offline storage: expo-sqlite
- Analytics/telemetry: posthog-js
- Data utilities: xlsx
- Security utilities: crypto-js
- Testing: Jest + Testing Library
- Hosting: Vercel

## Project Structure

- `src/` - application screens, services, state logic
- `src/sdk/` - telemetry, governance, process, attribution, ROI modules
- `src/sdkHooks/` - SDK integration hooks
- `public/data/` - JSON service datasets used by the app
- `data/` - source CSV/XLSX data assets
- `scripts/` - setup verification tooling
- `docs/` - project documentation pages

## Documentation

- [Documentation Index](docs/INDEX.md)
- [Installation Guide](docs/INSTALLATION.md)
- [SDK Framework](SDK_FRAMEWORK.md)

## Local Setup

### Prerequisites

- Node.js 18+
- npm 9+

### Install dependencies

```bash
npm install
```

### Validate workspace

```bash
npm run setup:verify
```

### Start development server

```bash
npm start
```

### Build production bundle

```bash
npm run build
```

## Available Scripts

- `npm run setup:project` - full setup check with actionable output
- `npm run setup:verify` - verification-only setup checks
- `npm start` - starts local dev server
- `npm run build` - creates production build
- `npm test` - runs tests
- `npm run docs:start` - serves docs site locally
- `npm run docs:build` - builds docs site

## Deployment (Vercel)

This repository is configured for a Create React App style build.

- Build command: `npm run build`
- Output directory: `build`
- SPA routing rewrite: all routes -> `index.html`

Current production alias:

- https://victo-sdk.vercel.app

## KPI and ROI Operating Context

This project aligns with a standardized product measurement model (TNI26073 direction):

- Every feature should define business outcomes and KPIs before implementation.
- Instrumentation should use a shared event contract and SDK layer.
- Attribution and ROI analysis should be done from a central analytics model.
- Releases should meet baseline instrumentation criteria before go-live.

This ensures product decisions are data-driven, comparable across features, and tied to measurable value.


