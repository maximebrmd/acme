# Peal::Post

## Properties

| Name | Type | Description | Notes |
| ---- | ---- | ----------- | ----- |
| **author_id** | **String** |  |  |
| **content** | [**PostContent**](PostContent.md) |  |  |
| **id** | **String** |  |  |
| **outcome** | [**PostOutcome**](PostOutcome.md) |  |  |
| **schedule** | [**PostSchedule**](PostSchedule.md) |  |  |
| **status** | [**PostStatus**](PostStatus.md) |  |  |
| **targets** | [**Array&lt;PostTarget&gt;**](PostTarget.md) |  |  |

## Example

```ruby
require 'peal'

instance = Peal::Post.new(
  author_id: null,
  content: null,
  id: null,
  outcome: null,
  schedule: null,
  status: null,
  targets: null
)
```

