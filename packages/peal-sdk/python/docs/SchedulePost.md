# SchedulePost


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**at** | **str** |  | 
**channel_ids** | **List[str]** |  | 
**time_zone** | **str** |  | 

## Example

```python
from peal.models.schedule_post import SchedulePost

# TODO update the JSON string below
json = "{}"
# create an instance of SchedulePost from a JSON string
schedule_post_instance = SchedulePost.from_json(json)
# print the JSON string representation of the object
print(SchedulePost.to_json())

# convert the object into a dict
schedule_post_dict = schedule_post_instance.to_dict()
# create an instance of SchedulePost from a dict
schedule_post_from_dict = SchedulePost.from_dict(schedule_post_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


