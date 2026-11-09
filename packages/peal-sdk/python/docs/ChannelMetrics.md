# ChannelMetrics


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**impressions** | **int** |  | 
**likes** | **int** |  | 
**posts** | **int** |  | 
**quotes** | **int** |  | 
**replies** | **int** |  | 
**reposts** | **int** |  | 
**channel_id** | **str** |  | 

## Example

```python
from peal.models.channel_metrics import ChannelMetrics

# TODO update the JSON string below
json = "{}"
# create an instance of ChannelMetrics from a JSON string
channel_metrics_instance = ChannelMetrics.from_json(json)
# print the JSON string representation of the object
print(ChannelMetrics.to_json())

# convert the object into a dict
channel_metrics_dict = channel_metrics_instance.to_dict()
# create an instance of ChannelMetrics from a dict
channel_metrics_from_dict = ChannelMetrics.from_dict(channel_metrics_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


