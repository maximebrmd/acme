# Peal::Usage

## Properties

| Name | Type | Description | Notes |
| ---- | ---- | ----------- | ----- |
| **assistant_requests** | [**PeriodUsage**](PeriodUsage.md) |  |  |
| **channels** | **Integer** |  |  |
| **media_storage** | **Integer** |  |  |
| **members** | **Integer** |  |  |
| **scheduled_posts** | [**PeriodUsage**](PeriodUsage.md) |  |  |

## Example

```ruby
require 'peal'

instance = Peal::Usage.new(
  assistant_requests: null,
  channels: null,
  media_storage: null,
  members: null,
  scheduled_posts: null
)
```

