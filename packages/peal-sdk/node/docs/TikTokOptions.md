
# TikTokOptions

How a post goes out on a TikTok account. Scheduling needs `privacyLevel`.

## Properties

Name | Type
------------ | -------------
`aiGenerated` | boolean
`brandContent` | boolean
`brandOrganic` | boolean
`commercialContent` | boolean
`disableComment` | boolean
`disableDuet` | boolean
`disableStitch` | boolean
`platform` | string
`privacyLevel` | [TikTokPrivacyLevel](TikTokPrivacyLevel.md)

## Example

```typescript
import type { TikTokOptions } from 'peal'

// TODO: Update the object below with actual values
const example = {
  "aiGenerated": null,
  "brandContent": null,
  "brandOrganic": null,
  "commercialContent": null,
  "disableComment": null,
  "disableDuet": null,
  "disableStitch": null,
  "platform": null,
  "privacyLevel": null,
} satisfies TikTokOptions

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as TikTokOptions
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


