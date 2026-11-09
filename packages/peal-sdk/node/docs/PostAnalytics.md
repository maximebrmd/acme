
# PostAnalytics


## Properties

Name | Type
------------ | -------------
`postId` | string
`targets` | [Array&lt;TargetMetrics&gt;](TargetMetrics.md)

## Example

```typescript
import type { PostAnalytics } from 'peal-sdk'

// TODO: Update the object below with actual values
const example = {
  "postId": null,
  "targets": null,
} satisfies PostAnalytics

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as PostAnalytics
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


