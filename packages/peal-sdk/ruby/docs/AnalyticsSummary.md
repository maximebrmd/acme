# Peal::AnalyticsSummary

## Properties

| Name | Type | Description | Notes |
| ---- | ---- | ----------- | ----- |
| **channels** | [**Array&lt;ChannelMetrics&gt;**](ChannelMetrics.md) |  |  |
| **days** | [**Array&lt;EngagementDay&gt;**](EngagementDay.md) |  |  |
| **from** | **String** |  |  |
| **time_zone** | **String** |  |  |
| **to** | **String** |  |  |
| **top_posts** | [**Array&lt;TopPost&gt;**](TopPost.md) |  |  |
| **totals** | [**MetricTotals**](MetricTotals.md) |  |  |

## Example

```ruby
require 'peal'

instance = Peal::AnalyticsSummary.new(
  channels: null,
  days: null,
  from: null,
  time_zone: null,
  to: null,
  top_posts: null,
  totals: null
)
```

