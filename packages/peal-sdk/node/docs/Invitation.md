
# Invitation


## Properties

Name | Type
------------ | -------------
`createdAt` | string
`email` | string
`expiresAt` | string
`id` | string
`inviterId` | string
`role` | string

## Example

```typescript
import type { Invitation } from 'peal'

// TODO: Update the object below with actual values
const example = {
  "createdAt": null,
  "email": null,
  "expiresAt": null,
  "id": null,
  "inviterId": null,
  "role": null,
} satisfies Invitation

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as Invitation
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


