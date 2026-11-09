# Peal::NoticeEventAnyOf5

## Properties

| Name | Type | Description | Notes |
| ---- | ---- | ----------- | ----- |
| **_tag** | **String** |  |  |
| **interval** | [**BillingInterval**](BillingInterval.md) |  |  |
| **plan** | [**PaidPlan**](PaidPlan.md) |  |  |
| **price** | [**Money**](Money.md) |  |  |
| **started_at** | **String** |  |  |
| **trial_end** | **String** |  |  |

## Example

```ruby
require 'peal'

instance = Peal::NoticeEventAnyOf5.new(
  _tag: null,
  interval: null,
  plan: null,
  price: null,
  started_at: null,
  trial_end: null
)
```

