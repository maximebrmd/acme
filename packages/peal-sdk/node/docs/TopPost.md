
# TopPost


## Properties

Name | Type
------------ | -------------
`channelId` | string
`engagement` | number
`metrics` | [PostMetrics](PostMetrics.md)
`permalink` | string
`postId` | string
`publishedAt` | string
`targetId` | string

## Example

```typescript
import type { TopPost } from 'peal-sdk'

// TODO: Update the object below with actual values
const example = {
  "channelId": null,
  "engagement": null,
  "metrics": null,
  "permalink": null,
  "postId": null,
  "publishedAt": null,
  "targetId": null,
} satisfies TopPost

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as TopPost
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


