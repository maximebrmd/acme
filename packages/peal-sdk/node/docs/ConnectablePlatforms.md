
# ConnectablePlatforms


## Properties

Name | Type
------------ | -------------
`instagramConnections` | [Array&lt;InstagramConnection&gt;](InstagramConnection.md)
`platforms` | [Array&lt;Platform&gt;](Platform.md)

## Example

```typescript
import type { ConnectablePlatforms } from 'peal-sdk'

// TODO: Update the object below with actual values
const example = {
  "instagramConnections": null,
  "platforms": null,
} satisfies ConnectablePlatforms

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as ConnectablePlatforms
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


