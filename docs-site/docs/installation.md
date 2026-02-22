---
id: installation
title: Installation & Project Setup
slug: /installation
---

# Installation & Project Setup

## Prerequisites

- Node.js 18+
- npm 9+

## Install

```bash
npm install
```

## Validate setup

```bash
npm run setup:verify
```

Full validation mode:

```bash
npm run setup:project
```

## Run locally

```bash
npm start
```

## Build production bundle

```bash
npm run build
```

## Troubleshooting

- Missing dependencies: run `npm install`
- Missing data files: verify assets under `data/`
- Setup check failures: ensure required docs and SDK files exist

## Source document

For full setup details, see `docs/INSTALLATION.md` in the app repository.
