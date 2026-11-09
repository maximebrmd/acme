
# PostTarget


## Properties

Name | Type
------------ | -------------
`channelId` | string
`failureReason` | [FailureReason](FailureReason.md)
`id` | string
`keptPrivate` | boolean
`options` | [TargetOptions](TargetOptions.md)
`permalink` | string
`publishedAt` | string
`round` | number
`status` | [PostTargetStatus](PostTargetStatus.md)
`unconfirmedReason` | [UnconfirmedReason](UnconfirmedReason.md)

## Example

```typescript
import type { PostTarget } from 'peal'

// TODO: Update the object below with actual values
const example = {
  "channelId": null,
  "failureReason": null,
  "id": null,
  "keptPrivate": null,
  "options": null,
  "permalink": null,
  "publishedAt": null,
  "round": null,
  "status": null,
  "unconfirmedReason": null,
} satisfies PostTarget

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as PostTarget
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


