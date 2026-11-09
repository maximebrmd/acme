# EngagementDay


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**var_date** | **str** |  | 
**likes** | **int** |  | 
**quotes** | **int** |  | 
**replies** | **int** |  | 
**reposts** | **int** |  | 

## Example

```python
from peal.models.engagement_day import EngagementDay

# TODO update the JSON string below
json = "{}"
# create an instance of EngagementDay from a JSON string
engagement_day_instance = EngagementDay.from_json(json)
# print the JSON string representation of the object
print(EngagementDay.to_json())

# convert the object into a dict
engagement_day_dict = engagement_day_instance.to_dict()
# create an instance of EngagementDay from a dict
engagement_day_from_dict = EngagementDay.from_dict(engagement_day_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


