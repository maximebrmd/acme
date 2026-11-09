
# NotificationPreferences


## Properties

Name | Type
------------ | -------------
`email` | [NotificationPreferencesEmail](NotificationPreferencesEmail.md)
`everyPost` | boolean

## Example

```typescript
import type { NotificationPreferences } from 'peal'

// TODO: Update the object below with actual values
const example = {
  "email": null,
  "everyPost": null,
} satisfies NotificationPreferences

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as NotificationPreferences
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


