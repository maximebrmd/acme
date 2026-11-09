
# Billing


## Properties

Name | Type
------------ | -------------
`allowances` | [PlanAllowances](PlanAllowances.md)
`currency` | string
`enabled` | boolean
`plan` | [Plan](Plan.md)
`plans` | [Array&lt;PlanOffer&gt;](PlanOffer.md)
`subscription` | [BillingSubscription](BillingSubscription.md)
`trial` | [TrialOffer](TrialOffer.md)
`usage` | [Usage](Usage.md)
`vatRate` | number
`withdrawableUntil` | string

## Example

```typescript
import type { Billing } from 'peal-sdk'

// TODO: Update the object below with actual values
const example = {
  "allowances": null,
  "currency": null,
  "enabled": null,
  "plan": null,
  "plans": null,
  "subscription": null,
  "trial": null,
  "usage": null,
  "vatRate": null,
  "withdrawableUntil": null,
} satisfies Billing

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as Billing
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


