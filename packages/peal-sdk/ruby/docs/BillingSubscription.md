# Peal::BillingSubscription

## Properties

| Name | Type | Description | Notes |
| ---- | ---- | ----------- | ----- |
| **cancel_at_period_end** | **Boolean** |  |  |
| **current_period_end** | **String** |  |  |
| **interval** | [**BillingInterval**](BillingInterval.md) |  |  |
| **plan** | [**PaidPlan**](PaidPlan.md) |  |  |
| **started_at** | **String** |  |  |
| **status** | [**SubscriptionStatus**](SubscriptionStatus.md) |  |  |
| **trial_end** | **String** |  |  |

## Example

```ruby
require 'peal'

instance = Peal::BillingSubscription.new(
  cancel_at_period_end: null,
  current_period_end: null,
  interval: null,
  plan: null,
  started_at: null,
  status: null,
  trial_end: null
)
```

