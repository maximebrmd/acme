
# PostDraft


## Properties

Name | Type
------------ | -------------
`channelIds` | Array&lt;string&gt;
`content` | [PostContent](PostContent.md)
`options` | [Array&lt;ChannelOptions&gt;](ChannelOptions.md)

## Example

```typescript
import type { PostDraft } from 'peal'

// TODO: Update the object below with actual values
const example = {
  "channelIds": null,
  "content": null,
  "options": null,
} satisfies PostDraft

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as PostDraft
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


