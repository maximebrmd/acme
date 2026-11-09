# PlanLimitReachedEncoded


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**tag** | **str** |  | 
**allowed** | **int** |  | 
**limit** | [**PlanLimit**](PlanLimit.md) |  | 

## Example

```python
from peal.models.plan_limit_reached_encoded import PlanLimitReachedEncoded

# TODO update the JSON string below
json = "{}"
# create an instance of PlanLimitReachedEncoded from a JSON string
plan_limit_reached_encoded_instance = PlanLimitReachedEncoded.from_json(json)
# print the JSON string representation of the object
print(PlanLimitReachedEncoded.to_json())

# convert the object into a dict
plan_limit_reached_encoded_dict = plan_limit_reached_encoded_instance.to_dict()
# create an instance of PlanLimitReachedEncoded from a dict
plan_limit_reached_encoded_from_dict = PlanLimitReachedEncoded.from_dict(plan_limit_reached_encoded_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


