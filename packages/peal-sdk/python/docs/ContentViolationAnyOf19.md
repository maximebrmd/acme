# ContentViolationAnyOf19


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**tag** | **str** |  | 
**channel_id** | **str** |  | 
**platform** | [**Platform**](Platform.md) |  | 
**media_id** | **str** |  | 
**byte_size** | **int** |  | 
**minimum** | **int** |  | 

## Example

```python
from peal.models.content_violation_any_of19 import ContentViolationAnyOf19

# TODO update the JSON string below
json = "{}"
# create an instance of ContentViolationAnyOf19 from a JSON string
content_violation_any_of19_instance = ContentViolationAnyOf19.from_json(json)
# print the JSON string representation of the object
print(ContentViolationAnyOf19.to_json())

# convert the object into a dict
content_violation_any_of19_dict = content_violation_any_of19_instance.to_dict()
# create an instance of ContentViolationAnyOf19 from a dict
content_violation_any_of19_from_dict = ContentViolationAnyOf19.from_dict(content_violation_any_of19_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


