# ContentViolationAnyOf3


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**tag** | **str** |  | 
**channel_id** | **str** |  | 
**platform** | [**Platform**](Platform.md) |  | 
**options_platform** | [**Platform**](Platform.md) |  | 

## Example

```python
from peal.models.content_violation_any_of3 import ContentViolationAnyOf3

# TODO update the JSON string below
json = "{}"
# create an instance of ContentViolationAnyOf3 from a JSON string
content_violation_any_of3_instance = ContentViolationAnyOf3.from_json(json)
# print the JSON string representation of the object
print(ContentViolationAnyOf3.to_json())

# convert the object into a dict
content_violation_any_of3_dict = content_violation_any_of3_instance.to_dict()
# create an instance of ContentViolationAnyOf3 from a dict
content_violation_any_of3_from_dict = ContentViolationAnyOf3.from_dict(content_violation_any_of3_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


