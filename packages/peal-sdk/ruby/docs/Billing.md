# Peal::Billing

## Properties

| Name | Type | Description | Notes |
| ---- | ---- | ----------- | ----- |
| **allowances** | [**PlanAllowances**](PlanAllowances.md) |  |  |
| **enabled** | **Boolean** |  |  |
| **plan** | [**Plan**](Plan.md) |  |  |
| **plans** | [**Array&lt;PlanOffer&gt;**](PlanOffer.md) |  |  |
| **subscription** | [**BillingSubscription**](BillingSubscription.md) |  |  |
| **usage** | [**Usage**](Usage.md) |  |  |

## Example

```ruby
require 'peal'

instance = Peal::Billing.new(
  allowances: null,
  enabled: null,
  plan: null,
  plans: null,
  subscription: null,
  usage: null
)
```

