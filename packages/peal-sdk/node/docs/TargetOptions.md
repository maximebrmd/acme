
# TargetOptions

What a post says on a channel that only its platform knows, tagged by `platform`. Platforms without options take none.

## Properties

Name | Type
------------ | -------------
`categoryId` | string
`containsSyntheticMedia` | boolean
`madeForKids` | boolean
`notifySubscribers` | boolean
`platform` | string
`privacy` | [YouTubePrivacy](YouTubePrivacy.md)
`tags` | Array&lt;string&gt;
`title` | string
`aiGenerated` | boolean
`brandContent` | boolean
`brandOrganic` | boolean
`commercialContent` | boolean
`disableComment` | boolean
`disableDuet` | boolean
`disableStitch` | boolean
`privacyLevel` | [TikTokPrivacyLevel](TikTokPrivacyLevel.md)

## Example

```typescript
import type { TargetOptions } from 'peal'

// TODO: Update the object below with actual values
const example = {
  "categoryId": null,
  "containsSyntheticMedia": null,
  "madeForKids": null,
  "notifySubscribers": null,
  "platform": null,
  "privacy": null,
  "tags": null,
  "title": null,
  "aiGenerated": null,
  "brandContent": null,
  "brandOrganic": null,
  "commercialContent": null,
  "disableComment": null,
  "disableDuet": null,
  "disableStitch": null,
  "privacyLevel": null,
} satisfies TargetOptions

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as TargetOptions
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


