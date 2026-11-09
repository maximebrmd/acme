
# Membership


## Properties

Name | Type
------------ | -------------
`id` | string
`name` | string
`permissions` | Array&lt;string&gt;
`role` | string
`slug` | string

## Example

```typescript
import type { Membership } from 'peal'

// TODO: Update the object below with actual values
const example = {
  "id": null,
  "name": null,
  "permissions": null,
  "role": null,
  "slug": null,
} satisfies Membership

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as Membership
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


