
# MetricsSnapshot


## Properties

Name | Type
------------ | -------------
`collectedAt` | string
`metrics` | [PostMetrics](PostMetrics.md)

## Example

```typescript
import type { MetricsSnapshot } from 'peal'

// TODO: Update the object below with actual values
const example = {
  "collectedAt": null,
  "metrics": null,
} satisfies MetricsSnapshot

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as MetricsSnapshot
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


