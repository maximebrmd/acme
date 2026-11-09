# AssistantQuotaExceededEncoded


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**tag** | **str** |  | 
**daily_limit** | **int** |  | 
**resets_at** | **str** |  | 

## Example

```python
from peal.models.assistant_quota_exceeded_encoded import AssistantQuotaExceededEncoded

# TODO update the JSON string below
json = "{}"
# create an instance of AssistantQuotaExceededEncoded from a JSON string
assistant_quota_exceeded_encoded_instance = AssistantQuotaExceededEncoded.from_json(json)
# print the JSON string representation of the object
print(AssistantQuotaExceededEncoded.to_json())

# convert the object into a dict
assistant_quota_exceeded_encoded_dict = assistant_quota_exceeded_encoded_instance.to_dict()
# create an instance of AssistantQuotaExceededEncoded from a dict
assistant_quota_exceeded_encoded_from_dict = AssistantQuotaExceededEncoded.from_dict(assistant_quota_exceeded_encoded_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


