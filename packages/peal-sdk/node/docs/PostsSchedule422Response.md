
# PostsSchedule422Response


## Properties

Name | Type
------------ | -------------
`tag` | string
`timeZone` | string
`violations` | [Array&lt;ContentViolation&gt;](ContentViolation.md)
`channelIds` | Array&lt;string&gt;
`mediaIds` | Array&lt;string&gt;

## Example

```typescript
import type { PostsSchedule422Response } from 'peal-sdk'

// TODO: Update the object below with actual values
const example = {
  "tag": null,
  "timeZone": null,
  "violations": null,
  "channelIds": null,
  "mediaIds": null,
} satisfies PostsSchedule422Response

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as PostsSchedule422Response
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


