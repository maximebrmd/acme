# PostsSchedule422Response


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**tag** | **str** |  | 
**time_zone** | **str** |  | 
**violations** | [**List[ContentViolation]**](ContentViolation.md) |  | 
**channel_ids** | **List[str]** |  | 
**media_ids** | **List[str]** |  | 

## Example

```python
from peal.models.posts_schedule422_response import PostsSchedule422Response

# TODO update the JSON string below
json = "{}"
# create an instance of PostsSchedule422Response from a JSON string
posts_schedule422_response_instance = PostsSchedule422Response.from_json(json)
# print the JSON string representation of the object
print(PostsSchedule422Response.to_json())

# convert the object into a dict
posts_schedule422_response_dict = posts_schedule422_response_instance.to_dict()
# create an instance of PostsSchedule422Response from a dict
posts_schedule422_response_from_dict = PostsSchedule422Response.from_dict(posts_schedule422_response_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


