
# TikTokAccount


## Properties

Name | Type
------------ | -------------
`posting` | [TikTokAccountPosting](TikTokAccountPosting.md)
`takesPhotos` | boolean

## Example

```typescript
import type { TikTokAccount } from 'peal-sdk'

// TODO: Update the object below with actual values
const example = {
  "posting": null,
  "takesPhotos": null,
} satisfies TikTokAccount

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as TikTokAccount
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


