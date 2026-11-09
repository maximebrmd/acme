# Peal::Usage

## Properties

| Name | Type | Description | Notes |
| ---- | ---- | ----------- | ----- |
| **assistant_requests** | [**PeriodUsage**](PeriodUsage.md) |  |  |
| **channels** | **Integer** |  |  |
| **members** | **Integer** |  |  |
| **scheduled_posts** | [**PeriodUsage**](PeriodUsage.md) |  |  |

## Example

```ruby
require 'peal'

instance = Peal::Usage.new(
  assistant_requests: null,
  channels: null,
  members: null,
  scheduled_posts: null
)
```

