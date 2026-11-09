
# TargetMetrics


## Properties

Name | Type
------------ | -------------
`channelId` | string
`collecting` | boolean
`lastCollectedAt` | string
`latest` | [PostMetrics](PostMetrics.md)
`permalink` | string
`publishedAt` | string
`snapshots` | [Array&lt;MetricsSnapshot&gt;](MetricsSnapshot.md)
`targetId` | string

## Example

```typescript
import type { TargetMetrics } from 'peal'

// TODO: Update the object below with actual values
const example = {
  "channelId": null,
  "collecting": null,
  "lastCollectedAt": null,
  "latest": null,
  "permalink": null,
  "publishedAt": null,
  "snapshots": null,
  "targetId": null,
} satisfies TargetMetrics

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as TargetMetrics
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


