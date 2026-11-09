# TopPost


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**channel_id** | **str** |  | 
**engagement** | **int** |  | 
**metrics** | [**PostMetrics**](PostMetrics.md) |  | 
**permalink** | **str** |  | 
**post_id** | **str** |  | 
**published_at** | **str** |  | 
**target_id** | **str** |  | 

## Example

```python
from peal.models.top_post import TopPost

# TODO update the JSON string below
json = "{}"
# create an instance of TopPost from a JSON string
top_post_instance = TopPost.from_json(json)
# print the JSON string representation of the object
print(TopPost.to_json())

# convert the object into a dict
top_post_dict = top_post_instance.to_dict()
# create an instance of TopPost from a dict
top_post_from_dict = TopPost.from_dict(top_post_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


