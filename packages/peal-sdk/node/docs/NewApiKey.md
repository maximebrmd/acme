
# NewApiKey


## Properties

Name | Type
------------ | -------------
`expiresInDays` | number
`name` | string
`permissions` | Array&lt;string&gt;

## Example

```typescript
import type { NewApiKey } from 'peal'

// TODO: Update the object below with actual values
const example = {
  "expiresInDays": null,
  "name": null,
  "permissions": null,
} satisfies NewApiKey

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as NewApiKey
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


