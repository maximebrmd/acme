
# PostsCreate422Response


## Properties

Name | Type
------------ | -------------
`tag` | string
`violations` | [Array&lt;ContentViolation&gt;](ContentViolation.md)
`channelIds` | Array&lt;string&gt;
`mediaIds` | Array&lt;string&gt;

## Example

```typescript
import type { PostsCreate422Response } from 'peal-sdk'

// TODO: Update the object below with actual values
const example = {
  "tag": null,
  "violations": null,
  "channelIds": null,
  "mediaIds": null,
} satisfies PostsCreate422Response

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as PostsCreate422Response
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


