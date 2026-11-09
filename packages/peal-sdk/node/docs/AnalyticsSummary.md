
# AnalyticsSummary


## Properties

Name | Type
------------ | -------------
`channels` | [Array&lt;ChannelMetrics&gt;](ChannelMetrics.md)
`days` | [Array&lt;EngagementDay&gt;](EngagementDay.md)
`from` | string
`timeZone` | string
`to` | string
`topPosts` | [Array&lt;TopPost&gt;](TopPost.md)
`totals` | [MetricTotals](MetricTotals.md)

## Example

```typescript
import type { AnalyticsSummary } from 'peal'

// TODO: Update the object below with actual values
const example = {
  "channels": null,
  "days": null,
  "from": null,
  "timeZone": null,
  "to": null,
  "topPosts": null,
  "totals": null,
} satisfies AnalyticsSummary

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as AnalyticsSummary
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


