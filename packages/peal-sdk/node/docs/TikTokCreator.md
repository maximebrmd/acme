
# TikTokCreator


## Properties

Name | Type
------------ | -------------
`avatarUrl` | string
`commentDisabled` | boolean
`duetDisabled` | boolean
`maxVideoDurationMs` | number
`nickname` | string
`privacyLevels` | [Array&lt;TikTokPrivacyLevel&gt;](TikTokPrivacyLevel.md)
`stitchDisabled` | boolean
`username` | string

## Example

```typescript
import type { TikTokCreator } from 'peal'

// TODO: Update the object below with actual values
const example = {
  "avatarUrl": null,
  "commentDisabled": null,
  "duetDisabled": null,
  "maxVideoDurationMs": null,
  "nickname": null,
  "privacyLevels": null,
  "stitchDisabled": null,
  "username": null,
} satisfies TikTokCreator

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as TikTokCreator
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


