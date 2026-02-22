---
id: policy-enforcement
title: Policy Enforcement
slug: /policy-enforcement
---

# Policy Enforcement

Telemetry is policy-first: events must be linked to a predefined business policy.

## Enforcement requirements

- A valid `policyId` is mandatory
- `eventId` must exist within that policy
- Required payload fields must be present
- Payload is validated before queueing

## Tracking pattern

```ts
victoriSdk.track({
  policyId: BUSINESS_POLICIES.POL_BENEFIT_REGISTRATION,
  eventId: 'REGISTRATION_SUBMITTED',
  payload: {
    farmerId: 'F123',
    schemeId: 'PMFBY_2024',
    aadhaarNumber: 'XXXX-XXXX-XXXX',
    bankAccountNumber: '1234567890',
  },
});
```

## Source document

See `POLICY_ENFORCEMENT_IMPLEMENTATION.md` for implementation details.
