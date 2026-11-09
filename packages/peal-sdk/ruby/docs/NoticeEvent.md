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
| **interval** | [**BillingInterval**](BillingInterval.md) |  |  |
| **plan** | [**PaidPlan**](PaidPlan.md) |  |  |
| **price** | [**Money**](Money.md) |  |  |
| **started_at** | **String** |  |  |
| **trial_end** | **String** |  |  |
| **ends_at** | **String** |  |  |
| **renews_at** | **String** |  |  |
| **refunded** | [**Money**](Money.md) |  |  |
| **withdrawn_at** | **String** |  |  |

## Example

```ruby
require 'peal'

instance = Peal::NoticeEvent.new(
  _tag: null,
  channel: null,
  permalink: null,
  post_id: null,
  reason: null,
  expires_at: null,
  interval: null,
  plan: null,
  price: null,
  started_at: null,
  trial_end: null,
  ends_at: null,
  renews_at: null,
  refunded: null,
  withdrawn_at: null
)
```

