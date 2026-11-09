# PeriodUsage


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**resets_at** | **str** |  | 
**used** | **int** |  | 

## Example

```python
from peal.models.period_usage import PeriodUsage

# TODO update the JSON string below
json = "{}"
# create an instance of PeriodUsage from a JSON string
period_usage_instance = PeriodUsage.from_json(json)
# print the JSON string representation of the object
print(PeriodUsage.to_json())

# convert the object into a dict
period_usage_dict = period_usage_instance.to_dict()
# create an instance of PeriodUsage from a dict
period_usage_from_dict = PeriodUsage.from_dict(period_usage_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


