# Peal::Billing

## Properties

| Name | Type | Description | Notes |
| ---- | ---- | ----------- | ----- |
| **allowances** | [**PlanAllowances**](PlanAllowances.md) |  |  |
| **currency** | **String** |  |  |
| **enabled** | **Boolean** |  |  |
| **plan** | [**Plan**](Plan.md) |  |  |
| **plans** | [**Array&lt;PlanOffer&gt;**](PlanOffer.md) |  |  |
| **subscription** | [**BillingSubscription**](BillingSubscription.md) |  |  |
| **trial** | [**TrialOffer**](TrialOffer.md) |  |  |
| **usage** | [**Usage**](Usage.md) |  |  |
| **vat_rate** | **Integer** |  |  |
| **withdrawable_until** | **String** |  |  |

## Example

```ruby
require 'peal'

instance = Peal::Billing.new(
  allowances: null,
  currency: null,
  enabled: null,
  plan: null,
  plans: null,
  subscription: null,
  trial: null,
  usage: null,
  vat_rate: null,
  withdrawable_until: null
)
```

