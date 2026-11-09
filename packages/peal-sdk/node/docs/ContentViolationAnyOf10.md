
# ContentViolationAnyOf10


## Properties

Name | Type
------------ | -------------
`tag` | string
`channelId` | string
`platform` | [Platform](Platform.md)
`count` | number
`maximum` | number

## Example

```typescript
import type { ContentViolationAnyOf10 } from 'peal-sdk'

// TODO: Update the object below with actual values
const example = {
  "tag": null,
  "channelId": null,
  "platform": null,
  "count": null,
  "maximum": null,
} satisfies ContentViolationAnyOf10

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as ContentViolationAnyOf10
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


