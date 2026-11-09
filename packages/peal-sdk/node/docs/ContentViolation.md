
# ContentViolation


## Properties

Name | Type
------------ | -------------
`tag` | string
`channelId` | string
`platform` | [Platform](Platform.md)
`optionsPlatform` | [Platform](Platform.md)
`field` | string
`length` | number
`maximum` | number
`unit` | [TextUnit](TextUnit.md)
`characters` | Array&lt;string&gt;
`count` | number
`mediaId` | string
`contentType` | [MediaContentType](MediaContentType.md)
`byteSize` | number
`minimum` | [ContentViolationAnyOf24Maximum](ContentViolationAnyOf24Maximum.md)
`durationMs` | number
`maximumMs` | number
`minimumMs` | number
`height` | number
`width` | number

## Example

```typescript
import type { ContentViolation } from 'peal-sdk'

// TODO: Update the object below with actual values
const example = {
  "tag": null,
  "channelId": null,
  "platform": null,
  "optionsPlatform": null,
  "field": null,
  "length": null,
  "maximum": null,
  "unit": null,
  "characters": null,
  "count": null,
  "mediaId": null,
  "contentType": null,
  "byteSize": null,
  "minimum": null,
  "durationMs": null,
  "maximumMs": null,
  "minimumMs": null,
  "height": null,
  "width": null,
} satisfies ContentViolation

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as ContentViolation
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


