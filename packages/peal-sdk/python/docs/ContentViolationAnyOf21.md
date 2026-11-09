# ContentViolationAnyOf21


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**tag** | **str** |  | 
**channel_id** | **str** |  | 
**platform** | [**Platform**](Platform.md) |  | 
**media_id** | **str** |  | 
**duration_ms** | **int** |  | 
**minimum_ms** | **int** |  | 

## Example

```python
from peal.models.content_violation_any_of21 import ContentViolationAnyOf21

# TODO update the JSON string below
json = "{}"
# create an instance of ContentViolationAnyOf21 from a JSON string
content_violation_any_of21_instance = ContentViolationAnyOf21.from_json(json)
# print the JSON string representation of the object
print(ContentViolationAnyOf21.to_json())

# convert the object into a dict
content_violation_any_of21_dict = content_violation_any_of21_instance.to_dict()
# create an instance of ContentViolationAnyOf21 from a dict
content_violation_any_of21_from_dict = ContentViolationAnyOf21.from_dict(content_violation_any_of21_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


