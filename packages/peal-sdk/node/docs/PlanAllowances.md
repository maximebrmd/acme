
# PlanAllowances


## Properties

Name | Type
------------ | -------------
`assistantRequests` | number
`channels` | number
`members` | number
`scheduledPosts` | number

## Example

```typescript
import type { PlanAllowances } from 'peal'

// TODO: Update the object below with actual values
const example = {
  "assistantRequests": null,
  "channels": null,
  "members": null,
  "scheduledPosts": null,
} satisfies PlanAllowances

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as PlanAllowances
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


