# PostMetrics


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**impressions** | **int** |  | 
**likes** | **int** |  | 
**quotes** | **int** |  | 
**replies** | **int** |  | 
**reposts** | **int** |  | 

## Example

```python
from peal.models.post_metrics import PostMetrics

# TODO update the JSON string below
json = "{}"
# create an instance of PostMetrics from a JSON string
post_metrics_instance = PostMetrics.from_json(json)
# print the JSON string representation of the object
print(PostMetrics.to_json())

# convert the object into a dict
post_metrics_dict = post_metrics_instance.to_dict()
# create an instance of PostMetrics from a dict
post_metrics_from_dict = PostMetrics.from_dict(post_metrics_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


