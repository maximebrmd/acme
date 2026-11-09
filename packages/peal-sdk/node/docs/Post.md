
# Post


## Properties

Name | Type
------------ | -------------
`authorId` | string
`content` | [PostContent](PostContent.md)
`id` | string
`outcome` | [PostOutcome](PostOutcome.md)
`schedule` | [PostSchedule](PostSchedule.md)
`status` | [PostStatus](PostStatus.md)
`targets` | [Array&lt;PostTarget&gt;](PostTarget.md)

## Example

```typescript
import type { Post } from 'peal-sdk'

// TODO: Update the object below with actual values
const example = {
  "authorId": null,
  "content": null,
  "id": null,
  "outcome": null,
  "schedule": null,
  "status": null,
  "targets": null,
} satisfies Post

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as Post
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


