
# ConnectOutcome


## Properties

Name | Type
------------ | -------------
`tag` | string
`channel` | [Channel](Channel.md)
`accounts` | [Array&lt;ChoosableAccount&gt;](ChoosableAccount.md)
`expiresAt` | string
`selection` | string

## Example

```typescript
import type { ConnectOutcome } from 'peal-sdk'

// TODO: Update the object below with actual values
const example = {
  "tag": null,
  "channel": null,
  "accounts": null,
  "expiresAt": null,
  "selection": null,
} satisfies ConnectOutcome

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as ConnectOutcome
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


