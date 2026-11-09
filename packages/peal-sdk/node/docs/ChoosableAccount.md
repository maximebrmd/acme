
# ChoosableAccount


## Properties

Name | Type
------------ | -------------
`accountId` | string
`avatarUrl` | string
`connected` | boolean
`displayName` | string
`handle` | string

## Example

```typescript
import type { ChoosableAccount } from 'peal-sdk'

// TODO: Update the object below with actual values
const example = {
  "accountId": null,
  "avatarUrl": null,
  "connected": null,
  "displayName": null,
  "handle": null,
} satisfies ChoosableAccount

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as ChoosableAccount
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


