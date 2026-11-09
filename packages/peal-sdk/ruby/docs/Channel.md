# Peal::Channel

## Properties

| Name | Type | Description | Notes |
| ---- | ---- | ----------- | ----- |
| **avatar_url** | **String** |  |  |
| **connection** | [**InstagramConnection**](InstagramConnection.md) |  |  |
| **display_name** | **String** |  |  |
| **handle** | **String** |  |  |
| **id** | **String** |  |  |
| **platform** | [**Platform**](Platform.md) |  |  |
| **status** | [**ChannelStatus**](ChannelStatus.md) |  |  |
| **token_expires_at** | **String** |  |  |

## Example

```ruby
require 'peal'

instance = Peal::Channel.new(
  avatar_url: null,
  connection: null,
  display_name: null,
  handle: null,
  id: null,
  platform: null,
  status: null,
  token_expires_at: null
)
```

