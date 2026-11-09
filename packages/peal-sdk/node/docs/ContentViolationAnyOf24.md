
# ContentViolationAnyOf24


## Properties

Name | Type
------------ | -------------
`tag` | string
`channelId` | string
`platform` | [Platform](Platform.md)
`mediaId` | string
`height` | number
`width` | number
`maximum` | [ContentViolationAnyOf24Maximum](ContentViolationAnyOf24Maximum.md)
`minimum` | [ContentViolationAnyOf24Maximum](ContentViolationAnyOf24Maximum.md)

## Example

```typescript
import type { ContentViolationAnyOf24 } from 'peal'

// TODO: Update the object below with actual values
const example = {
  "tag": null,
  "channelId": null,
  "platform": null,
  "mediaId": null,
  "height": null,
  "width": null,
  "maximum": null,
  "minimum": null,
} satisfies ContentViolationAnyOf24

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as ContentViolationAnyOf24
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


