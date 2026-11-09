
# UploadTargetAnyOf1


## Properties

Name | Type
------------ | -------------
`tag` | string
`expiresAt` | string
`partSize` | number
`parts` | [Array&lt;UploadPart&gt;](UploadPart.md)

## Example

```typescript
import type { UploadTargetAnyOf1 } from 'peal-sdk'

// TODO: Update the object below with actual values
const example = {
  "tag": null,
  "expiresAt": null,
  "partSize": null,
  "parts": null,
} satisfies UploadTargetAnyOf1

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as UploadTargetAnyOf1
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


