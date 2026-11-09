
# ConnectCallback


## Properties

Name | Type
------------ | -------------
`code` | string
`error` | string
`iss` | string
`state` | string

## Example

```typescript
import type { ConnectCallback } from 'peal-sdk'

// TODO: Update the object below with actual values
const example = {
  "code": null,
  "error": null,
  "iss": null,
  "state": null,
} satisfies ConnectCallback

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as ConnectCallback
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


