
# AssistantAction


## Properties

Name | Type
------------ | -------------
`tag` | string
`tone` | [AssistantTone](AssistantTone.md)
`platform` | [Platform](Platform.md)
`language` | [TranslationLanguage](TranslationLanguage.md)

## Example

```typescript
import type { AssistantAction } from 'peal'

// TODO: Update the object below with actual values
const example = {
  "tag": null,
  "tone": null,
  "platform": null,
  "language": null,
} satisfies AssistantAction

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as AssistantAction
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


