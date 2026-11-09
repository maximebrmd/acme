# PlanAllowances


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**assistant_requests** | **int** |  | 
**channels** | **int** |  | 
**members** | **int** |  | 
**scheduled_posts** | **int** |  | 

## Example

```python
from peal.models.plan_allowances import PlanAllowances

# TODO update the JSON string below
json = "{}"
# create an instance of PlanAllowances from a JSON string
plan_allowances_instance = PlanAllowances.from_json(json)
# print the JSON string representation of the object
print(PlanAllowances.to_json())

# convert the object into a dict
plan_allowances_dict = plan_allowances_instance.to_dict()
# create an instance of PlanAllowances from a dict
plan_allowances_from_dict = PlanAllowances.from_dict(plan_allowances_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


