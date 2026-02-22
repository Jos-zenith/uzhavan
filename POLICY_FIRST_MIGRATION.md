# Policy-First Telemetry: Developer Migration Guide

## MRD Requirement
> "Developers cannot track events without linking to a pre-defined Business Policy"

All telemetry events MUST reference a pre-registered business policy. Events are validated against policy schemas at runtime.

---

## Available Policies

18 core policies are pre-registered:

```
POL_SUBSIDY_VELOCITY              → Track subsidy disbursement velocity
POL_BENEFIT_REGISTRATION          → Track farmer registrations
POL_PEST_ALERT_CONVERSION         → Track pest alert effectiveness  
POL_PEST_IDENTIFICATION           → Track pest ID requests & ML inference
POL_WEATHER_ADVISORY              → Track weather advisory delivery
POL_FARMING_GUIDANCE              → Track farming guidance engagement
POL_MARKET_PRICING                → Track market intelligence usage
POL_COMMODITY_TRENDS              → Track commodity trend analysis
POL_MACHINERY_HIRING              → Track machinery rental bookings
POL_REPAIR_REQUESTS               → Track machinery repair requests
POL_SEED_STOCK                    → Track seed availability queries
POL_FERTILIZER_SUPPLY             → Track fertilizer stock/distribution
POL_RESERVOIR_LEVELS              → Track water level monitoring
POL_WATER_ADVISORY                → Track irrigation advisories
POL_MSME_CHARTER                  → Track MSME registrations
POL_AGRICULTURAL_NEWS             → Track news consumption
```

---

## Migration: Old → New API

### ❌ OLD API (Removed)
```typescript
// This will throw an error:
victoriSdk.track('INSURANCE_PREMIUM_CALCULATED', { 
  action: 'open_portal' 
});
// Error: Legacy track API removed. Use policy-first approach.
```

### ✅ NEW API (Required)
```typescript
import { victoriSdk, BUSINESS_POLICIES } from './victoriSdk';

victoriSdk.track({
  policyId: BUSINESS_POLICIES.POL_INSURANCE_PREMIUM,  // ← Link to policy
  eventId: 'PREMIUM_CALCULATED',                       // ← Event in policy
  payload: {                                            // ← Schema-validated
    action: 'open_portal',
    url: 'https://pmfby.gov.in',
  },
});
```

---

## Steps to Migrate a Screen

### 1. Identify the Policy
Find which policy applies to your domain:

```typescript
// Example: Benefit Registration Screen
// Domain: Farmer benefit scheme registration
// Policy: POL_BENEFIT_REGISTRATION
```

### 2. Find All Track Calls
```bash
grep -n "victoriSdk.track\|track(" src/BenefitRegistrationScreen.tsx
```

### 3. Update Each Track Call
```typescript
// BEFORE:
track({
  eventId: 'ANY_EVENT_WITH_LOCATION',
  payload: { action: 'view_benefit_schemes', schemeCount: 5 }
});

// AFTER:
track({
  policyId: BUSINESS_POLICIES.POL_BENEFIT_REGISTRATION,
  eventId: 'REGISTRATION_FORM_VIEWED',
  payload: {
    farmerId: farmerId,       // ✅ Required
    schemeId: selectedScheme, // ✅ Required
    schemeCount: 5,           // ✓ Optional
  },
});
```

### 4. Verify Required Fields
Each event has a schema. Example for `POL_BENEFIT_REGISTRATION`:

```
Event: REGISTRATION_FORM_VIEWED
  Required: farmerId, schemeId
  Optional: —

Event: REGISTRATION_SUBMITTED
  Required: farmerId, schemeId, aadhaarNumber, bankAccountNumber
  Optional: landArea, cropType, bankIfsc

Event: REGISTRATION_APPROVED
  Required: registrationId, approverName
  Optional: approvalNotes
```

### 5. Handle Errors
```typescript
try {
  track({
    policyId: BUSINESS_POLICIES.POL_BENEFIT_REGISTRATION,
    eventId: 'REGISTRATION_SUBMITTED',
    payload: {
      farmerId: 'F123',
      // Missing required: schemeId, aadhaarNumber, bankAccountNumber
    },
  });
} catch (error) {
  console.error('Telemetry validation failed:', error.message);
  // Error shows exactly which fields are missing
}
```

---

## Policy Schema: How to Check

```typescript
import { victoriSdk } from './victoriSdk';

// Get all policies
const policies = victoriSdk.getPolicies();

// Find a policy
const benefitPolicy = policies.find(
  p => p.policyId === BUSINESS_POLICIES.POL_BENEFIT_REGISTRATION
);

// View all events in the policy
benefitPolicy?.events.forEach(event => {
  console.log(`Event: ${event.eventId}`);
  console.log(`  Description: ${event.description}`);
  console.log(`  Required: ${event.requiredFields.join(', ')}`);
  console.log(`  Optional: ${event.optionalFields.join(', ')}`);
  if (event.maxFrequencyPerHour) {
    console.log(`  Max frequency: ${event.maxFrequencyPerHour}/hour`);
  }
});
```

---

## Examples by Screen

### Benefit Registration Screen

```typescript
import { useVictori, BUSINESS_POLICIES } from './victoriSdk';

function BenefitRegistrationScreen() {
  const { track } = useVictori();

  const loadSchemes = async () => {
    const schemes = await getSchemes();
    
    track({
      policyId: BUSINESS_POLICIES.POL_BENEFIT_REGISTRATION,
      eventId: 'REGISTRATION_FORM_VIEWED',
      payload: {
        farmerId: currentFarmer.id,     // ✅ Required
        schemeId: 'PMFBY_2024',          // ✅ Required
      },
    });
  };

  const submitForm = async (formData) => {
    track({
      policyId: BUSINESS_POLICIES.POL_BENEFIT_REGISTRATION,
      eventId: 'REGISTRATION_SUBMITTED',
      payload: {
        farmerId: formData.farmerId,          // ✅ Required
        schemeId: formData.schemeId,          // ✅ Required
        aadhaarNumber: formData.aadhaar,      // ✅ Required
        bankAccountNumber: formData.bankAcct, // ✅ Required
        landArea: formData.landArea,          // ✓ Optional
        cropType: formData.crop,              // ✓ Optional
      },
    });
  };
}
```

### Pest Identification Screen

```typescript
import { useVictori, BUSINESS_POLICIES } from './victoriSdk';

function PestIdentificationScreen() {
  const { track } = useVictori();

  const identifyPest = async (imageFile) => {
    const requestId = `REQ_${Date.now()}`;
    
    // Step 1: Request submitted
    track({
      policyId: BUSINESS_POLICIES.POL_PEST_IDENTIFICATION,
      eventId: 'IDENTIFICATION_REQUESTED',
      payload: {
        requestId,          // ✅ Required
        farmerId: userId,   // ✅ Required
      },
    });

    // Step 2: ML inference
    const result = await mlModel.predict(imageFile);
    track({
      policyId: BUSINESS_POLICIES.POL_PEST_IDENTIFICATION,
      eventId: 'ML_MODEL_INFERENCE',
      payload: {
        requestId,                    // ✅ Required
        modelVersion: 'v2.1.0',       // ✅ Required
        pestDetected: result.pestName, // ✅ Required
        confidence: result.confidence, // ✅ Required
        inferenceTimeMs: result.ms,    // ✓ Optional
      },
    });
  };
}
```

### Machinery Hiring Screen

```typescript
import { useVictori, BUSINESS_POLICIES } from './victoriSdk';

function MachineryHiringScreen() {
  const { track } = useVictori();

  const bookMachinery = async (booking) => {
    track({
      policyId: BUSINESS_POLICIES.POL_MACHINERY_HIRING,
      eventId: 'BOOKING_INITIATED',
      payload: {
        farmerId: booking.farmerId,        // ✅ Required
        machineryId: booking.machineryId,  // ✅ Required
        rentalDate: booking.rentalDate,    // ✅ Required
        duration: booking.duration,        // ✓ Optional
        hiringCentre: booking.centre,      // ✓ Optional
      },
    });
  };

  const confirmBooking = async (bookingId, totalCost) => {
    track({
      policyId: BUSINESS_POLICIES.POL_MACHINERY_HIRING,
      eventId: 'BOOKING_CONFIRMED',
      payload: {
        bookingId,      // ✅ Required
        totalCost,      // ✅ Required
      },
    });
  };
}
```

---

## Enforcement Rules

1. **Policy must exist** → Throws error if not found
2. **Event must be in policy** → Throws error if not defined
3. **Required fields required** → Throws error if missing
4. **Unknown fields warned** → Logged as warning but allowed (for forward compatibility)
5. **Payload immutable** → Event is queued immediately and cannot be modified

---

## FAQ

### Q: What if I need a new event?
**A:** Contact the SDK team to add it to the policy schema. Do NOT create arbitrary events.

### Q: What if I need a new policy?
**A:** Contact the SDK team. Policies must be approved before use.

### Q: Can I bypass policy checks?
**A:** No. The enforcement layer will throw an error. All events must link to policies.

### Q: What about testing?
**A:** In tests, mock `victoriSdk.track()` or use `PolicyRegistryClient` to register test policies.

### Q: Performance impact?
**A:** Validation is synchronous and milliseconds. Event queuing is async.

---

## Checklist: Ready to Migrate?

- [ ] All `victoriSdk.track()` calls updated to policy-first API
- [ ] TypeScript compiles (`npm run build`)
- [ ] All screens tested in browser (`npm start`)
- [ ] No validation errors in console
- [ ] Error handling added for missing fields
- [ ] Documentation updated for team
- [ ] Code review completed
- [ ] Merged to main branch

---

## Support

For issues or questions:
1. Check the policy schema: `victoriSdk.getPolicies()`
2. Review this guide
3. Contact the SDK team for new policy requests
