# PostSchedule


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**at** | **str** |  | 
**time_zone** | **str** |  | 

## Example

```python
from peal.models.post_schedule import PostSchedule

# TODO update the JSON string below
json = "{}"
# create an instance of PostSchedule from a JSON string
post_schedule_instance = PostSchedule.from_json(json)
# print the JSON string representation of the object
print(PostSchedule.to_json())

# convert the object into a dict
post_schedule_dict = post_schedule_instance.to_dict()
# create an instance of PostSchedule from a dict
post_schedule_from_dict = PostSchedule.from_dict(post_schedule_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


