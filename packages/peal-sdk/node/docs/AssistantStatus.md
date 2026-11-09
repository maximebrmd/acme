
# AssistantStatus


## Properties

Name | Type
------------ | -------------
`available` | boolean
`dailyLimit` | number
`maxTextLength` | number
`remaining` | number
`resetsAt` | string

## Example

```typescript
import type { AssistantStatus } from 'peal-sdk'

// TODO: Update the object below with actual values
const example = {
  "available": null,
  "dailyLimit": null,
  "maxTextLength": null,
  "remaining": null,
  "resetsAt": null,
} satisfies AssistantStatus

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as AssistantStatus
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


