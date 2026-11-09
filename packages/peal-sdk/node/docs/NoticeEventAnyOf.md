
# NoticeEventAnyOf


## Properties

Name | Type
------------ | -------------
`tag` | string
`channel` | [NoticeChannel](NoticeChannel.md)
`permalink` | string
`postId` | string

## Example

```typescript
import type { NoticeEventAnyOf } from 'peal-sdk'

// TODO: Update the object below with actual values
const example = {
  "tag": null,
  "channel": null,
  "permalink": null,
  "postId": null,
} satisfies NoticeEventAnyOf

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as NoticeEventAnyOf
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


