# ContentViolationAnyOf4


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**tag** | **str** |  | 
**channel_id** | **str** |  | 
**platform** | [**Platform**](Platform.md) |  | 
**var_field** | **str** |  | 

## Example

```python
from peal.models.content_violation_any_of4 import ContentViolationAnyOf4

# TODO update the JSON string below
json = "{}"
# create an instance of ContentViolationAnyOf4 from a JSON string
content_violation_any_of4_instance = ContentViolationAnyOf4.from_json(json)
# print the JSON string representation of the object
print(ContentViolationAnyOf4.to_json())

# convert the object into a dict
content_violation_any_of4_dict = content_violation_any_of4_instance.to_dict()
# create an instance of ContentViolationAnyOf4 from a dict
content_violation_any_of4_from_dict = ContentViolationAnyOf4.from_dict(content_violation_any_of4_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


