
# ChannelMetrics


## Properties

Name | Type
------------ | -------------
`impressions` | number
`likes` | number
`posts` | number
`quotes` | number
`replies` | number
`reposts` | number
`channelId` | string

## Example

```typescript
import type { ChannelMetrics } from 'peal'

// TODO: Update the object below with actual values
const example = {
  "impressions": null,
  "likes": null,
  "posts": null,
  "quotes": null,
  "replies": null,
  "reposts": null,
  "channelId": null,
} satisfies ChannelMetrics

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as ChannelMetrics
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


