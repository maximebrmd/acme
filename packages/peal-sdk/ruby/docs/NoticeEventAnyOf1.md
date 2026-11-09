# Peal::NoticeEventAnyOf1

## Properties

| Name | Type | Description | Notes |
| ---- | ---- | ----------- | ----- |
| **_tag** | **String** |  |  |
| **channel** | [**NoticeChannel**](NoticeChannel.md) |  |  |
| **post_id** | **String** |  |  |
| **reason** | [**FailureReason**](FailureReason.md) |  |  |

## Example

```ruby
require 'peal'

instance = Peal::NoticeEventAnyOf1.new(
  _tag: null,
  channel: null,
  post_id: null,
  reason: null
)
```

