# PostsCreate422Response


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**tag** | **str** |  | 
**violations** | [**List[ContentViolation]**](ContentViolation.md) |  | 
**channel_ids** | **List[str]** |  | 
**media_ids** | **List[str]** |  | 

## Example

```python
from peal.models.posts_create422_response import PostsCreate422Response

# TODO update the JSON string below
json = "{}"
# create an instance of PostsCreate422Response from a JSON string
posts_create422_response_instance = PostsCreate422Response.from_json(json)
# print the JSON string representation of the object
print(PostsCreate422Response.to_json())

# convert the object into a dict
posts_create422_response_dict = posts_create422_response_instance.to_dict()
# create an instance of PostsCreate422Response from a dict
posts_create422_response_from_dict = PostsCreate422Response.from_dict(posts_create422_response_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


