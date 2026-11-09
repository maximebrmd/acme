# PostAnalytics


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**post_id** | **str** |  | 
**targets** | [**List[TargetMetrics]**](TargetMetrics.md) |  | 

## Example

```python
from peal.models.post_analytics import PostAnalytics

# TODO update the JSON string below
json = "{}"
# create an instance of PostAnalytics from a JSON string
post_analytics_instance = PostAnalytics.from_json(json)
# print the JSON string representation of the object
print(PostAnalytics.to_json())

# convert the object into a dict
post_analytics_dict = post_analytics_instance.to_dict()
# create an instance of PostAnalytics from a dict
post_analytics_from_dict = PostAnalytics.from_dict(post_analytics_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


