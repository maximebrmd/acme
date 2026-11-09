# MetricsSnapshot


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**collected_at** | **str** |  | 
**metrics** | [**PostMetrics**](PostMetrics.md) |  | 

## Example

```python
from peal.models.metrics_snapshot import MetricsSnapshot

# TODO update the JSON string below
json = "{}"
# create an instance of MetricsSnapshot from a JSON string
metrics_snapshot_instance = MetricsSnapshot.from_json(json)
# print the JSON string representation of the object
print(MetricsSnapshot.to_json())

# convert the object into a dict
metrics_snapshot_dict = metrics_snapshot_instance.to_dict()
# create an instance of MetricsSnapshot from a dict
metrics_snapshot_from_dict = MetricsSnapshot.from_dict(metrics_snapshot_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


