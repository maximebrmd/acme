
# NotificationPreferencesChangeEmail


## Properties

Name | Type
------------ | -------------
`channelReconnect` | boolean
`postFailed` | boolean
`postPublished` | boolean
`postUnconfirmed` | boolean

## Example

```typescript
import type { NotificationPreferencesChangeEmail } from 'peal-sdk'

// TODO: Update the object below with actual values
const example = {
  "channelReconnect": null,
  "postFailed": null,
  "postPublished": null,
  "postUnconfirmed": null,
} satisfies NotificationPreferencesChangeEmail

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as NotificationPreferencesChangeEmail
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


