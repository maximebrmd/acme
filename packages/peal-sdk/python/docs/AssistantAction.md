# AssistantAction


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**tag** | **str** |  | 
**tone** | [**AssistantTone**](AssistantTone.md) |  | 
**platform** | [**Platform**](Platform.md) |  | 
**language** | [**TranslationLanguage**](TranslationLanguage.md) |  | 

## Example

```python
from peal.models.assistant_action import AssistantAction

# TODO update the JSON string below
json = "{}"
# create an instance of AssistantAction from a JSON string
assistant_action_instance = AssistantAction.from_json(json)
# print the JSON string representation of the object
print(AssistantAction.to_json())

# convert the object into a dict
assistant_action_dict = assistant_action_instance.to_dict()
# create an instance of AssistantAction from a dict
assistant_action_from_dict = AssistantAction.from_dict(assistant_action_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


