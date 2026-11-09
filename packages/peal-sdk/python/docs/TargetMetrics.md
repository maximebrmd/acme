# TargetMetrics


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**channel_id** | **str** |  | 
**collecting** | **bool** |  | 
**last_collected_at** | **str** |  | 
**latest** | [**PostMetrics**](PostMetrics.md) |  | 
**permalink** | **str** |  | 
**published_at** | **str** |  | 
**snapshots** | [**List[MetricsSnapshot]**](MetricsSnapshot.md) |  | 
**target_id** | **str** |  | 

## Example

```python
from peal.models.target_metrics import TargetMetrics

# TODO update the JSON string below
json = "{}"
# create an instance of TargetMetrics from a JSON string
target_metrics_instance = TargetMetrics.from_json(json)
# print the JSON string representation of the object
print(TargetMetrics.to_json())

# convert the object into a dict
target_metrics_dict = target_metrics_instance.to_dict()
# create an instance of TargetMetrics from a dict
target_metrics_from_dict = TargetMetrics.from_dict(target_metrics_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


