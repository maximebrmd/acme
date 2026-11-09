# PlanPrice


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**month** | **int** |  | 
**year** | **int** |  | 

## Example

```python
from peal.models.plan_price import PlanPrice

# TODO update the JSON string below
json = "{}"
# create an instance of PlanPrice from a JSON string
plan_price_instance = PlanPrice.from_json(json)
# print the JSON string representation of the object
print(PlanPrice.to_json())

# convert the object into a dict
plan_price_dict = plan_price_instance.to_dict()
# create an instance of PlanPrice from a dict
plan_price_from_dict = PlanPrice.from_dict(plan_price_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


