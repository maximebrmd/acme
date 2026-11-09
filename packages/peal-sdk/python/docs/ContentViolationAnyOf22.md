# ContentViolationAnyOf22


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**tag** | **str** |  | 
**channel_id** | **str** |  | 
**platform** | [**Platform**](Platform.md) |  | 
**media_id** | **str** |  | 
**height** | **int** |  | 
**width** | **int** |  | 
**maximum** | **int** |  | 

## Example

```python
from peal.models.content_violation_any_of22 import ContentViolationAnyOf22

# TODO update the JSON string below
json = "{}"
# create an instance of ContentViolationAnyOf22 from a JSON string
content_violation_any_of22_instance = ContentViolationAnyOf22.from_json(json)
# print the JSON string representation of the object
print(ContentViolationAnyOf22.to_json())

# convert the object into a dict
content_violation_any_of22_dict = content_violation_any_of22_instance.to_dict()
# create an instance of ContentViolationAnyOf22 from a dict
content_violation_any_of22_from_dict = ContentViolationAnyOf22.from_dict(content_violation_any_of22_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


