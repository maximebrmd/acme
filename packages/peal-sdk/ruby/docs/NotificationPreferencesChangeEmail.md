# Peal::NotificationPreferencesChangeEmail

## Properties

| Name | Type | Description | Notes |
| ---- | ---- | ----------- | ----- |
| **channel_reconnect** | **Boolean** |  | [optional] |
| **post_failed** | **Boolean** |  | [optional] |
| **post_published** | **Boolean** |  | [optional] |
| **post_unconfirmed** | **Boolean** |  | [optional] |

## Example

```ruby
require 'peal'

instance = Peal::NotificationPreferencesChangeEmail.new(
  channel_reconnect: null,
  post_failed: null,
  post_published: null,
  post_unconfirmed: null
)
```

