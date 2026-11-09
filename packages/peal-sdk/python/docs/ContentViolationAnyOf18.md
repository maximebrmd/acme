# ContentViolationAnyOf18


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**tag** | **str** |  | 
**channel_id** | **str** |  | 
**platform** | [**Platform**](Platform.md) |  | 
**media_id** | **str** |  | 
**byte_size** | **int** |  | 
**maximum** | **int** |  | 

## Example

```python
from peal.models.content_violation_any_of18 import ContentViolationAnyOf18

# TODO update the JSON string below
json = "{}"
# create an instance of ContentViolationAnyOf18 from a JSON string
content_violation_any_of18_instance = ContentViolationAnyOf18.from_json(json)
# print the JSON string representation of the object
print(ContentViolationAnyOf18.to_json())

# convert the object into a dict
content_violation_any_of18_dict = content_violation_any_of18_instance.to_dict()
# create an instance of ContentViolationAnyOf18 from a dict
content_violation_any_of18_from_dict = ContentViolationAnyOf18.from_dict(content_violation_any_of18_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


