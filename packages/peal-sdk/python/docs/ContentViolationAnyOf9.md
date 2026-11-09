# ContentViolationAnyOf9


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**tag** | **str** |  | 
**channel_id** | **str** |  | 
**platform** | [**Platform**](Platform.md) |  | 
**characters** | **List[str]** |  | 

## Example

```python
from peal.models.content_violation_any_of9 import ContentViolationAnyOf9

# TODO update the JSON string below
json = "{}"
# create an instance of ContentViolationAnyOf9 from a JSON string
content_violation_any_of9_instance = ContentViolationAnyOf9.from_json(json)
# print the JSON string representation of the object
print(ContentViolationAnyOf9.to_json())

# convert the object into a dict
content_violation_any_of9_dict = content_violation_any_of9_instance.to_dict()
# create an instance of ContentViolationAnyOf9 from a dict
content_violation_any_of9_from_dict = ContentViolationAnyOf9.from_dict(content_violation_any_of9_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


