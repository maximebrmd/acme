
# UploadPart


## Properties

Name | Type
------------ | -------------
`byteSize` | number
`partNumber` | number
`request` | [SignedRequest](SignedRequest.md)

## Example

```typescript
import type { UploadPart } from 'peal'

// TODO: Update the object below with actual values
const example = {
  "byteSize": null,
  "partNumber": null,
  "request": null,
} satisfies UploadPart

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as UploadPart
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


