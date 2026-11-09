# BillingSubscription


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**cancel_at_period_end** | **bool** |  | 
**current_period_end** | **str** |  | 
**interval** | [**BillingInterval**](BillingInterval.md) |  | 
**plan** | [**PaidPlan**](PaidPlan.md) |  | 
**started_at** | **str** |  | 
**status** | [**SubscriptionStatus**](SubscriptionStatus.md) |  | 
**trial_end** | **str** |  | 

## Example

```python
from peal.models.billing_subscription import BillingSubscription

# TODO update the JSON string below
json = "{}"
# create an instance of BillingSubscription from a JSON string
billing_subscription_instance = BillingSubscription.from_json(json)
# print the JSON string representation of the object
print(BillingSubscription.to_json())

# convert the object into a dict
billing_subscription_dict = billing_subscription_instance.to_dict()
# create an instance of BillingSubscription from a dict
billing_subscription_from_dict = BillingSubscription.from_dict(billing_subscription_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


