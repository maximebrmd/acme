# Peal::BillingSubscription

## Properties

| Name | Type | Description | Notes |
| ---- | ---- | ----------- | ----- |
| **cancel_at_period_end** | **Boolean** |  |  |
| **current_period_end** | **String** |  |  |
| **plan** | [**PaidPlan**](PaidPlan.md) |  |  |
| **status** | [**SubscriptionStatus**](SubscriptionStatus.md) |  |  |

## Example

```ruby
require 'peal'

instance = Peal::BillingSubscription.new(
  cancel_at_period_end: null,
  current_period_end: null,
  plan: null,
  status: null
)
```

