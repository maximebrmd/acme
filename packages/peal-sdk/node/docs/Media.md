
# Media


## Properties

Name | Type
------------ | -------------
`altText` | string
`byteSize` | number
`codec` | string
`contentType` | [MediaContentType](MediaContentType.md)
`createdAt` | string
`dimensions` | [MediaDimensions](MediaDimensions.md)
`durationMs` | number
`id` | string
`kind` | [MediaKind](MediaKind.md)
`status` | [MediaStatus](MediaStatus.md)
`updatedAt` | string
`url` | string

## Example

```typescript
import type { Media } from 'peal'

// TODO: Update the object below with actual values
const example = {
  "altText": null,
  "byteSize": null,
  "codec": null,
  "contentType": null,
  "createdAt": null,
  "dimensions": null,
  "durationMs": null,
  "id": null,
  "kind": null,
  "status": null,
  "updatedAt": null,
  "url": null,
} satisfies Media

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as Media
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


