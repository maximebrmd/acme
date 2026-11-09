
# PostContent


## Properties

Name | Type
------------ | -------------
`media` | [Array&lt;MediaAttachment&gt;](MediaAttachment.md)
`overrides` | [Array&lt;TextOverride&gt;](TextOverride.md)
`text` | string

## Example

```typescript
import type { PostContent } from 'peal-sdk'

// TODO: Update the object below with actual values
const example = {
  "media": null,
  "overrides": null,
  "text": null,
} satisfies PostContent

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as PostContent
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


