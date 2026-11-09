
# PublicationAttempt


## Properties

Name | Type
------------ | -------------
`attempt` | number
`finishedAt` | string
`result` | [AttemptResult](AttemptResult.md)
`retryAt` | string
`round` | number
`startedAt` | string
`targetId` | string

## Example

```typescript
import type { PublicationAttempt } from 'peal'

// TODO: Update the object below with actual values
const example = {
  "attempt": null,
  "finishedAt": null,
  "result": null,
  "retryAt": null,
  "round": null,
  "startedAt": null,
  "targetId": null,
} satisfies PublicationAttempt

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as PublicationAttempt
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


