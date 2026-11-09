
# Notice


## Properties

Name | Type
------------ | -------------
`createdAt` | string
`event` | [NoticeEvent](NoticeEvent.md)
`id` | string
`readAt` | string
`workspaceId` | string

## Example

```typescript
import type { Notice } from 'peal-sdk'

// TODO: Update the object below with actual values
const example = {
  "createdAt": null,
  "event": null,
  "id": null,
  "readAt": null,
  "workspaceId": null,
} satisfies Notice

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as Notice
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


