
# ApiKey


## Properties

Name | Type
------------ | -------------
`createdAt` | string
`expiresAt` | string
`id` | string
`name` | string
`permissions` | [Array&lt;Permission&gt;](Permission.md)
`start` | string

## Example

```typescript
import type { ApiKey } from 'peal-sdk'

// TODO: Update the object below with actual values
const example = {
  "createdAt": null,
  "expiresAt": null,
  "id": null,
  "name": null,
  "permissions": null,
  "start": null,
} satisfies ApiKey

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as ApiKey
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


