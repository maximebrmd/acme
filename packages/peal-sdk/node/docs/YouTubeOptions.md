
# YouTubeOptions

How a post goes out on a YouTube channel. Scheduling needs `title` and `madeForKids`.

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

## Example

```typescript
import type { YouTubeOptions } from 'peal-sdk'

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
} satisfies YouTubeOptions

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as YouTubeOptions
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


