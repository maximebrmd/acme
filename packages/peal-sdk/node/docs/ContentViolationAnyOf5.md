
# ContentViolationAnyOf5


## Properties

Name | Type
------------ | -------------
`tag` | string
`channelId` | string
`platform` | [Platform](Platform.md)
`field` | string
`length` | number
`maximum` | number

## Example

```typescript
import type { ContentViolationAnyOf5 } from 'peal-sdk'

// TODO: Update the object below with actual values
const example = {
  "tag": null,
  "channelId": null,
  "platform": null,
  "field": null,
  "length": null,
  "maximum": null,
} satisfies ContentViolationAnyOf5

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as ContentViolationAnyOf5
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


