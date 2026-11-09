# PlanOffer


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**allowances** | [**PlanAllowances**](PlanAllowances.md) |  | 
**plan** | [**Plan**](Plan.md) |  | 

## Example

```python
from peal.models.plan_offer import PlanOffer

# TODO update the JSON string below
json = "{}"
# create an instance of PlanOffer from a JSON string
plan_offer_instance = PlanOffer.from_json(json)
# print the JSON string representation of the object
print(PlanOffer.to_json())

# convert the object into a dict
plan_offer_dict = plan_offer_instance.to_dict()
# create an instance of PlanOffer from a dict
plan_offer_from_dict = PlanOffer.from_dict(plan_offer_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


