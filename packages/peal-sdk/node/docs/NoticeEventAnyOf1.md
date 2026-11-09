
# NoticeEventAnyOf1


## Properties

Name | Type
------------ | -------------
`tag` | string
`channel` | [NoticeChannel](NoticeChannel.md)
`postId` | string
`reason` | [FailureReason](FailureReason.md)

## Example

```typescript
import type { NoticeEventAnyOf1 } from 'peal'

// TODO: Update the object below with actual values
const example = {
  "tag": null,
  "channel": null,
  "postId": null,
  "reason": null,
} satisfies NoticeEventAnyOf1

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as NoticeEventAnyOf1
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


