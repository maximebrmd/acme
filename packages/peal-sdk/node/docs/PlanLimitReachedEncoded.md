
# PlanLimitReachedEncoded


## Properties

Name | Type
------------ | -------------
`tag` | string
`allowed` | number
`limit` | [PlanLimit](PlanLimit.md)

## Example

```typescript
import type { PlanLimitReachedEncoded } from 'peal'

// TODO: Update the object below with actual values
const example = {
  "tag": null,
  "allowed": null,
  "limit": null,
} satisfies PlanLimitReachedEncoded

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as PlanLimitReachedEncoded
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


