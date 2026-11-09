# Peal::TargetMetrics

## Properties

| Name | Type | Description | Notes |
| ---- | ---- | ----------- | ----- |
| **channel_id** | **String** |  |  |
| **collecting** | **Boolean** |  |  |
| **last_collected_at** | **String** |  |  |
| **latest** | [**PostMetrics**](PostMetrics.md) |  |  |
| **permalink** | **String** |  |  |
| **published_at** | **String** |  |  |
| **snapshots** | [**Array&lt;MetricsSnapshot&gt;**](MetricsSnapshot.md) |  |  |
| **target_id** | **String** |  |  |

## Example

```ruby
require 'peal'

instance = Peal::TargetMetrics.new(
  channel_id: null,
  collecting: null,
  last_collected_at: null,
  latest: null,
  permalink: null,
  published_at: null,
  snapshots: null,
  target_id: null
)
```

