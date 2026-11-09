
# Me


## Properties

Name | Type
------------ | -------------
`impersonatedBy` | string
`user` | [MeUser](MeUser.md)
`workspaces` | [Array&lt;Membership&gt;](Membership.md)

## Example

```typescript
import type { Me } from 'peal-sdk'

// TODO: Update the object below with actual values
const example = {
  "impersonatedBy": null,
  "user": null,
  "workspaces": null,
} satisfies Me

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as Me
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


