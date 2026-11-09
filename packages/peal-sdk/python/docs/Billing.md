# Billing


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**allowances** | [**PlanAllowances**](PlanAllowances.md) |  | 
**currency** | **str** |  | 
**enabled** | **bool** |  | 
**plan** | [**Plan**](Plan.md) |  | 
**plans** | [**List[PlanOffer]**](PlanOffer.md) |  | 
**subscription** | [**BillingSubscription**](BillingSubscription.md) |  | 
**trial** | [**TrialOffer**](TrialOffer.md) |  | 
**usage** | [**Usage**](Usage.md) |  | 
**vat_rate** | **int** |  | 
**withdrawable_until** | **str** |  | 

## Example

```python
from peal.models.billing import Billing

# TODO update the JSON string below
json = "{}"
# create an instance of Billing from a JSON string
billing_instance = Billing.from_json(json)
# print the JSON string representation of the object
print(Billing.to_json())

# convert the object into a dict
billing_dict = billing_instance.to_dict()
# create an instance of Billing from a dict
billing_from_dict = Billing.from_dict(billing_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


