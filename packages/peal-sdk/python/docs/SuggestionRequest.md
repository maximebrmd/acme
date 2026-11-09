# SuggestionRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**action** | [**AssistantAction**](AssistantAction.md) |  | 
**text** | **str** |  | 

## Example

```python
from peal.models.suggestion_request import SuggestionRequest

# TODO update the JSON string below
json = "{}"
# create an instance of SuggestionRequest from a JSON string
suggestion_request_instance = SuggestionRequest.from_json(json)
# print the JSON string representation of the object
print(SuggestionRequest.to_json())

# convert the object into a dict
suggestion_request_dict = suggestion_request_instance.to_dict()
# create an instance of SuggestionRequest from a dict
suggestion_request_from_dict = SuggestionRequest.from_dict(suggestion_request_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


