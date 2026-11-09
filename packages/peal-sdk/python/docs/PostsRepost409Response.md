# PostsRepost409Response


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**tag** | **str** |  | 
**status** | [**PostTargetStatus**](PostTargetStatus.md) |  | 

## Example

```python
from peal.models.posts_repost409_response import PostsRepost409Response

# TODO update the JSON string below
json = "{}"
# create an instance of PostsRepost409Response from a JSON string
posts_repost409_response_instance = PostsRepost409Response.from_json(json)
# print the JSON string representation of the object
print(PostsRepost409Response.to_json())

# convert the object into a dict
posts_repost409_response_dict = posts_repost409_response_instance.to_dict()
# create an instance of PostsRepost409Response from a dict
posts_repost409_response_from_dict = PostsRepost409Response.from_dict(posts_repost409_response_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


