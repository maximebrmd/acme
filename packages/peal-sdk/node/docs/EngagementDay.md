
# EngagementDay


## Properties

Name | Type
------------ | -------------
`date` | string
`likes` | number
`quotes` | number
`replies` | number
`reposts` | number

## Example

```typescript
import type { EngagementDay } from 'peal'

// TODO: Update the object below with actual values
const example = {
  "date": null,
  "likes": null,
  "quotes": null,
  "replies": null,
  "reposts": null,
} satisfies EngagementDay

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as EngagementDay
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


