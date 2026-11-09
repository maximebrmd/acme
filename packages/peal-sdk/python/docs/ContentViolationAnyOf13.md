# ContentViolationAnyOf13


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**tag** | **str** |  | 
**channel_id** | **str** |  | 
**platform** | [**Platform**](Platform.md) |  | 
**count** | **int** |  | 
**maximum** | **int** |  | 

## Example

```python
from peal.models.content_violation_any_of13 import ContentViolationAnyOf13

# TODO update the JSON string below
json = "{}"
# create an instance of ContentViolationAnyOf13 from a JSON string
content_violation_any_of13_instance = ContentViolationAnyOf13.from_json(json)
# print the JSON string representation of the object
print(ContentViolationAnyOf13.to_json())

# convert the object into a dict
content_violation_any_of13_dict = content_violation_any_of13_instance.to_dict()
# create an instance of ContentViolationAnyOf13 from a dict
content_violation_any_of13_from_dict = ContentViolationAnyOf13.from_dict(content_violation_any_of13_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


