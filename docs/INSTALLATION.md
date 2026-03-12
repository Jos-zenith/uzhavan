# Installation & Project Setup

This guide provides the complete local setup flow for the VICT Digital Agriculture Platform.

## Prerequisites

- Node.js 18 or later
- npm 9 or later
- Windows/macOS/Linux terminal

Check versions:

```bash
node -v
npm -v
```

## 1) Clone & Enter Project

```bash
git clone <your-repo-url>
cd my-app
```

If the repository is already available locally, open the `my-app` folder directly.

## 2) Install Dependencies

```bash
npm install
```

## 2.1) Configure OpenWeatherMap API Key

Create a `.env` file in the app root (same folder as `package.json`) and add:

```bash
REACT_APP_OPENWEATHER_API_KEY=<your_openweathermap_api_key>
```

Notes:

- You can copy from `.env.example`.
- Restart `npm start` after adding or changing `.env` values.

Optional telemetry and ROI demo controls:

```bash
REACT_APP_TELEMETRY_ENDPOINT=<your_ingestion_api_url>
REACT_APP_TELEMETRY_API_KEY=<your_ingestion_api_key>
REACT_APP_ROI_DEMO_MODE=true
```

- If telemetry endpoint is configured, SDK flush batches are posted to that endpoint.
- Set `REACT_APP_ROI_DEMO_MODE=false` to prevent synthetic KPI event injection in ROI dashboard.

## 3) Validate Project Setup

Run verification checks before first run:

```bash
npm run setup:verify
```

Full setup mode:

```bash
npm run setup:project
```

Validation checks include:

- Node.js version
- required workspace files and data assets
- dependency installation state
- SDK core module wiring
- documentation structure presence

## 4) Start Development Server

```bash
npm start
```

Expected result:

- local app served in browser
- successful compile
- no blocking TypeScript errors

## 5) Create Production Build

```bash
npm run build
```

Build output is generated in `build/`.

## 6) Run Tests

```bash
npm test
```

## Troubleshooting

### `setup:verify` fails

- Missing dependencies: run `npm install`
- Missing data files: verify files under `data/`
- Missing docs: ensure required markdown files exist

### Port conflict on start

- Free port 3000, or run on another port (platform-specific)

### Build failures

- Re-run `npm install`
- Clear stale cache and re-run build
- Review TypeScript errors shown in terminal

## Next Steps

- Explore docs index: [INDEX](INDEX.md)
- Review SDK architecture: [SDK Framework](../SDK_FRAMEWORK.md)
- For telemetry migration: [Policy-First Migration Guide](../POLICY_FIRST_MIGRATION.md)
