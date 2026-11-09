
# BillingSubscription


## Properties

Name | Type
------------ | -------------
`cancelAtPeriodEnd` | boolean
`currentPeriodEnd` | string
`interval` | [BillingInterval](BillingInterval.md)
`plan` | [PaidPlan](PaidPlan.md)
`startedAt` | string
`status` | [SubscriptionStatus](SubscriptionStatus.md)
`trialEnd` | string

## Example

```typescript
import type { BillingSubscription } from 'peal-sdk'

// TODO: Update the object below with actual values
const example = {
  "cancelAtPeriodEnd": null,
  "currentPeriodEnd": null,
  "interval": null,
  "plan": null,
  "startedAt": null,
  "status": null,
  "trialEnd": null,
} satisfies BillingSubscription

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as BillingSubscription
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


