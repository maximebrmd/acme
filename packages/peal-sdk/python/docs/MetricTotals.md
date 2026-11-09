# MetricTotals


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**impressions** | **int** |  | 
**likes** | **int** |  | 
**posts** | **int** |  | 
**quotes** | **int** |  | 
**replies** | **int** |  | 
**reposts** | **int** |  | 

## Example

```python
from peal.models.metric_totals import MetricTotals

# TODO update the JSON string below
json = "{}"
# create an instance of MetricTotals from a JSON string
metric_totals_instance = MetricTotals.from_json(json)
# print the JSON string representation of the object
print(MetricTotals.to_json())

# convert the object into a dict
metric_totals_dict = metric_totals_instance.to_dict()
# create an instance of MetricTotals from a dict
metric_totals_from_dict = MetricTotals.from_dict(metric_totals_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


