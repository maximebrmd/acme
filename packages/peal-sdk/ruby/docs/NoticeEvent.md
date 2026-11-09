# Peal::NoticeEvent

## Properties

| Name | Type | Description | Notes |
| ---- | ---- | ----------- | ----- |
| **_tag** | **String** |  |  |
| **channel** | [**NoticeChannel**](NoticeChannel.md) |  |  |
| **permalink** | **String** |  |  |
| **post_id** | **String** |  |  |
| **reason** | [**FailureReason**](FailureReason.md) |  |  |
| **expires_at** | **String** |  |  |

## Example

```ruby
require 'peal'

instance = Peal::NoticeEvent.new(
  _tag: null,
  channel: null,
  permalink: null,
  post_id: null,
  reason: null,
  expires_at: null
)
```

