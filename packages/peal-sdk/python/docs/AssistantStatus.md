# AssistantStatus


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**available** | **bool** |  | 
**daily_limit** | **int** |  | 
**max_text_length** | **int** |  | 
**remaining** | **int** |  | 
**resets_at** | **str** |  | 

## Example

```python
from peal.models.assistant_status import AssistantStatus

# TODO update the JSON string below
json = "{}"
# create an instance of AssistantStatus from a JSON string
assistant_status_instance = AssistantStatus.from_json(json)
# print the JSON string representation of the object
print(AssistantStatus.to_json())

# convert the object into a dict
assistant_status_dict = assistant_status_instance.to_dict()
# create an instance of AssistantStatus from a dict
assistant_status_from_dict = AssistantStatus.from_dict(assistant_status_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


