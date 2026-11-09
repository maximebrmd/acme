
# MeUser


## Properties

Name | Type
------------ | -------------
`email` | string
`emailVerified` | boolean
`id` | string
`image` | string
`locale` | string
`name` | string

## Example

```typescript
import type { MeUser } from 'peal-sdk'

// TODO: Update the object below with actual values
const example = {
  "email": null,
  "emailVerified": null,
  "id": null,
  "image": null,
  "locale": null,
  "name": null,
} satisfies MeUser

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as MeUser
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


