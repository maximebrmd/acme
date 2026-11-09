# ContentViolationAnyOf23


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
**minimum** | **int** |  | 

## Example

```python
from peal.models.content_violation_any_of23 import ContentViolationAnyOf23

# TODO update the JSON string below
json = "{}"
# create an instance of ContentViolationAnyOf23 from a JSON string
content_violation_any_of23_instance = ContentViolationAnyOf23.from_json(json)
# print the JSON string representation of the object
print(ContentViolationAnyOf23.to_json())

# convert the object into a dict
content_violation_any_of23_dict = content_violation_any_of23_instance.to_dict()
# create an instance of ContentViolationAnyOf23 from a dict
content_violation_any_of23_from_dict = ContentViolationAnyOf23.from_dict(content_violation_any_of23_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


