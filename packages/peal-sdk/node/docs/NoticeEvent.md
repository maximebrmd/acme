
# NoticeEvent


## Properties

Name | Type
------------ | -------------
`tag` | string
`channel` | [NoticeChannel](NoticeChannel.md)
`permalink` | string
`postId` | string
`reason` | [FailureReason](FailureReason.md)
`expiresAt` | string
`interval` | [BillingInterval](BillingInterval.md)
`plan` | [PaidPlan](PaidPlan.md)
`price` | [Money](Money.md)
`startedAt` | string
`trialEnd` | string
`endsAt` | string
`renewsAt` | string
`refunded` | [Money](Money.md)
`withdrawnAt` | string

## Example

```typescript
import type { NoticeEvent } from 'peal-sdk'

// TODO: Update the object below with actual values
const example = {
  "tag": null,
  "channel": null,
  "permalink": null,
  "postId": null,
  "reason": null,
  "expiresAt": null,
  "interval": null,
  "plan": null,
  "price": null,
  "startedAt": null,
  "trialEnd": null,
  "endsAt": null,
  "renewsAt": null,
  "refunded": null,
  "withdrawnAt": null,
} satisfies NoticeEvent

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as NoticeEvent
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


