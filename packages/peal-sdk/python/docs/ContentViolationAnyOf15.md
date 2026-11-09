# ContentViolationAnyOf15


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
from peal.models.content_violation_any_of15 import ContentViolationAnyOf15

# TODO update the JSON string below
json = "{}"
# create an instance of ContentViolationAnyOf15 from a JSON string
content_violation_any_of15_instance = ContentViolationAnyOf15.from_json(json)
# print the JSON string representation of the object
print(ContentViolationAnyOf15.to_json())

# convert the object into a dict
content_violation_any_of15_dict = content_violation_any_of15_instance.to_dict()
# create an instance of ContentViolationAnyOf15 from a dict
content_violation_any_of15_from_dict = ContentViolationAnyOf15.from_dict(content_violation_any_of15_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


