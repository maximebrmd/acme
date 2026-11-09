
# NoticeEventAnyOf5


## Properties

Name | Type
------------ | -------------
`tag` | string
`interval` | [BillingInterval](BillingInterval.md)
`plan` | [PaidPlan](PaidPlan.md)
`price` | [Money](Money.md)
`startedAt` | string
`trialEnd` | string

## Example

```typescript
import type { NoticeEventAnyOf5 } from 'peal-sdk'

// TODO: Update the object below with actual values
const example = {
  "tag": null,
  "interval": null,
  "plan": null,
  "price": null,
  "startedAt": null,
  "trialEnd": null,
} satisfies NoticeEventAnyOf5

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as NoticeEventAnyOf5
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


