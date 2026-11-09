
# Channel


## Properties

Name | Type
------------ | -------------
`avatarUrl` | string
`displayName` | string
`handle` | string
`id` | string
`platform` | [Platform](Platform.md)
`status` | [ChannelStatus](ChannelStatus.md)
`tokenExpiresAt` | string

## Example

```typescript
import type { Channel } from 'peal-sdk'

// TODO: Update the object below with actual values
const example = {
  "avatarUrl": null,
  "displayName": null,
  "handle": null,
  "id": null,
  "platform": null,
  "status": null,
  "tokenExpiresAt": null,
} satisfies Channel

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as Channel
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


