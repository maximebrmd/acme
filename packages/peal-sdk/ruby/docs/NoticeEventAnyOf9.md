# Peal::NoticeEventAnyOf9

## Properties

| Name | Type | Description | Notes |
| ---- | ---- | ----------- | ----- |
| **_tag** | **String** |  |  |
| **plan** | [**PaidPlan**](PaidPlan.md) |  |  |
| **refunded** | [**Money**](Money.md) |  |  |
| **withdrawn_at** | **String** |  |  |

## Example

```ruby
require 'peal'

instance = Peal::NoticeEventAnyOf9.new(
  _tag: null,
  plan: null,
  refunded: null,
  withdrawn_at: null
)
```

