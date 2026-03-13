import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { createHttpTelemetryTransport, OfflineAgriSdkProvider } from './sdk';
import { initTelemetry } from './telemetry/posthog';

const telemetryEndpoint = (process.env.REACT_APP_TELEMETRY_ENDPOINT || '').trim();
const telemetryApiKey = (process.env.REACT_APP_TELEMETRY_API_KEY || '').trim();
const telemetryTransport = telemetryEndpoint
  ? createHttpTelemetryTransport({
      endpoint: telemetryEndpoint,
      apiKey: telemetryApiKey || undefined,
    })
  : undefined;

initTelemetry();

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <OfflineAgriSdkProvider telemetryTransport={telemetryTransport}>
      <App />
    </OfflineAgriSdkProvider>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
