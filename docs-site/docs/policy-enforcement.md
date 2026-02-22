---
id: policy-enforcement
title: Policy Enforcement
slug: /policy-enforcement
---

# Policy Enforcement

Telemetry is **policy-first**: every event must be linked to a pre-defined Business Policy. This is the core MRD requirement -- developers cannot track events without a registered policy.

## How It Works

1. The `PolicyRegistryClient` maintains 16 pre-registered business policies
2. Each policy defines allowed events, required fields, and velocity constraints
3. `TelemetryClient.track()` validates `policyId`, `eventId`, and `payload` before queueing
4. Invalid events are **rejected with an error** -- they never enter the queue

```ts
// This is enforced at the SDK level
track(policyId: BusinessPolicyId, eventId: string, payload: TelemetryPayload, serviceId?: number)
```

## All 16 Business Policies

### Subsidy and Benefits

| Policy ID | Name | Owner | Velocity Limit |
|-----------|------|-------|----------------|
| `POL_SUBSIDY_VELOCITY` | Subsidy Velocity Policy | Finance Team | 1,000/hr |
| `POL_BENEFIT_REGISTRATION` | Benefit Registration Policy | Benefit Administration | 500/hr |

**POL_SUBSIDY_VELOCITY Events:**

| Event ID | Required Fields |
|----------|----------------|
| `SUBSIDY_APPLICATION_INITIATED` | `farmerId`, `schemeId`, `farmerName`, `phoneNumber` |
| `SUBSIDY_ELIGIBILITY_CHECKED` | `farmerId`, `schemeId`, `eligibilityStatus` |
| `SUBSIDY_APPROVED` | `farmerId`, `schemeId`, `approvalAmount`, `approverName` |
| `SUBSIDY_DISBURSED` | `farmerId`, `schemeId`, `disburseAmount`, `transactionId` |

**POL_BENEFIT_REGISTRATION Events:**

| Event ID | Required Fields |
|----------|----------------|
| `REGISTRATION_FORM_VIEWED` | `farmerId`, `schemeId` |
| `REGISTRATION_SUBMITTED` | `farmerId`, `schemeId`, `aadhaarNumber`, `bankAccountNumber` |
| `REGISTRATION_APPROVED` | `registrationId`, `approverName` |

### Pest and Disease

| Policy ID | Name | Owner | Velocity Limit |
|-----------|------|-------|----------------|
| `POL_PEST_ALERT_CONVERSION` | Pest Alert Conversion | Pest Management | 2,000/hr |
| `POL_PEST_IDENTIFICATION` | Pest Identification | Pest Science | 5,000/hr |

**POL_PEST_ALERT_CONVERSION Events:**

| Event ID | Required Fields |
|----------|----------------|
| `PEST_ALERT_RECEIVED` | `farmerId`, `pestType`, `severity`, `district` |
| `PEST_IDENTIFIED` | `identificationId`, `pestType`, `confidence` |
| `REMEDY_APPLIED` | `pestId`, `remedyType`, `farmerId` |

**POL_PEST_IDENTIFICATION Events:**

| Event ID | Required Fields |
|----------|----------------|
| `IDENTIFICATION_REQUESTED` | `requestId`, `farmerId` |
| `ML_MODEL_INFERENCE` | `requestId`, `modelVersion`, `pestDetected`, `confidence` |
| `IDENTIFICATION_CONFIRMED` | `requestId`, `expertId`, `pestsConfirmed` |

### Weather and Advisory

| Policy ID | Name | Owner | Velocity Limit |
|-----------|------|-------|----------------|
| `POL_WEATHER_ADVISORY` | Weather Advisory | Meteorology | 3,000/hr |
| `POL_FARMING_GUIDANCE` | Farming Guidance | Extension | 5,000/hr |

**POL_WEATHER_ADVISORY Events:**

| Event ID | Required Fields |
|----------|----------------|
| `WEATHER_FORECAST_FETCHED` | `district`, `forecastDays` |
| `ADVISORY_GENERATED` | `advisoryId`, `district`, `cropType` |
| `ADVISORY_VIEWED` | `advisoryId`, `farmerId` |

### Market Intelligence

| Policy ID | Name | Owner | Velocity Limit |
|-----------|------|-------|----------------|
| `POL_MARKET_PRICING` | Market Pricing | Market Intelligence | 2,000/hr |
| `POL_COMMODITY_TRENDS` | Commodity Trends | Data Analytics | 2,000/hr |

### Machinery and Operations

| Policy ID | Name | Owner | Velocity Limit |
|-----------|------|-------|----------------|
| `POL_MACHINERY_HIRING` | Machinery Hiring | Operations | 500/hr |
| `POL_REPAIR_REQUESTS` | Repair Requests | Service Management | 300/hr |

### Seeds and Inputs

| Policy ID | Name | Owner | Velocity Limit |
|-----------|------|-------|----------------|
| `POL_SEED_STOCK` | Seed Stock | Supply Chain | 500/hr |
| `POL_FERTILIZER_SUPPLY` | Fertilizer Supply | Agriculture Inputs | 500/hr |

### Water Management

| Policy ID | Name | Owner | Velocity Limit |
|-----------|------|-------|----------------|
| `POL_RESERVOIR_LEVELS` | Reservoir Levels | Water Management | 1,000/hr |
| `POL_WATER_ADVISORY` | Water Advisory | Hydrology | 1,500/hr |

### MSME and News

| Policy ID | Name | Owner | Velocity Limit |
|-----------|------|-------|----------------|
| `POL_MSME_CHARTER` | MSME Charter | MSME Development | 300/hr |
| `POL_AGRICULTURAL_NEWS` | Agricultural News | Content | 5,000/hr |

## PolicyEventSchema Interface

```ts
interface PolicyEventSchema {
  eventId: string;
  description: string;
  requiredFields: string[];
  optionalFields: string[];
  maxFrequencyPerHour?: number;
}
```

## BusinessPolicy Interface

```ts
interface BusinessPolicy {
  policyId: BusinessPolicyId;
  name: string;
  purpose: string;
  owner: string;
  approvedAt: string;
  events: PolicyEventSchema[];
  velocityLimitPerHour?: number;
}
```

## Validation Flow

```ts
// Inside TelemetryClient.track():
const validation = this.policyRegistry.validateEvent(policyId, eventId, payload);
if (!validation.valid) {
  throw new Error(`[POLICY ENFORCEMENT] Cannot track event. ${validation.errors.join('; ')}`);
}
```

The `validateEvent` method checks:

1. **Policy exists** -- Is `policyId` registered in the `PolicyRegistryClient`?
2. **Event belongs to policy** -- Is `eventId` defined in that policy's `events` array?
3. **Required fields present** -- Does the payload contain all `requiredFields`?
4. **Unknown fields warned** -- Fields not in `requiredFields` or `optionalFields` trigger a console warning (but do not fail validation)

## Usage Example

```tsx
import { useOfflineAgriSdk } from './sdk';
import { BUSINESS_POLICIES } from './sdk/policy';

function SubsidyForm() {
  const sdk = useOfflineAgriSdk();

  const handleSubmit = (formData) => {
    // Policy-enforced: will throw if fields are missing
    sdk.track(
      BUSINESS_POLICIES.POL_SUBSIDY_VELOCITY,
      'SUBSIDY_APPLICATION_INITIATED',
      {
        farmerId: formData.farmerId,
        schemeId: formData.schemeId,
        farmerName: formData.name,
        phoneNumber: formData.phone,
      },
      2  // serviceId for Subsidy Disbursement
    );
  };

  return <form onSubmit={handleSubmit}>...</form>;
}
```

## Registering Custom Policies

```ts
const telemetry = new TelemetryClient();
const registry = telemetry.getPolicyRegistry();

registry.registerPolicy({
  policyId: 'POL_CUSTOM_WORKFLOW' as BusinessPolicyId,
  name: 'Custom Workflow Policy',
  purpose: 'Track custom workflow events',
  owner: 'Custom Team',
  approvedAt: new Date().toISOString(),
  velocityLimitPerHour: 1000,
  events: [
    {
      eventId: 'CUSTOM_ACTION',
      description: 'A custom action by the user',
      requiredFields: ['userId', 'actionType'],
      optionalFields: ['metadata'],
    },
  ],
});
```
