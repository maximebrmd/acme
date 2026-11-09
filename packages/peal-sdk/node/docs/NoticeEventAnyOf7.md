
# NoticeEventAnyOf7


## Properties

Name | Type
------------ | -------------
`tag` | string
`plan` | [PaidPlan](PaidPlan.md)
`price` | [Money](Money.md)
`renewsAt` | string

## Example

```typescript
import type { NoticeEventAnyOf7 } from 'peal-sdk'

// TODO: Update the object below with actual values
const example = {
  "tag": null,
  "plan": null,
  "price": null,
  "renewsAt": null,
} satisfies NoticeEventAnyOf7

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as NoticeEventAnyOf7
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


