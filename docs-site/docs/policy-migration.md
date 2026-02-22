---
id: policy-migration
title: Policy Migration Guide
slug: /policy-migration
---

# Policy Migration Guide

Use this migration flow to move legacy tracking calls to policy-first telemetry.

## Migration steps

1. Identify domain policy
2. Replace legacy `track(eventId, payload)` calls
3. Add required policy event fields
4. Validate with `npm run build` and runtime checks

## Before

```ts
victoriSdk.track('ANY_EVENT', { action: 'x' });
```

## After

```ts
victoriSdk.track({
  policyId: BUSINESS_POLICIES.POL_BENEFIT_REGISTRATION,
  eventId: 'REGISTRATION_FORM_VIEWED',
  payload: {
    farmerId: 'F123',
    schemeId: 'PMFBY_2024',
  },
});
```

## Source document

See `POLICY_FIRST_MIGRATION.md` for complete examples by screen.
