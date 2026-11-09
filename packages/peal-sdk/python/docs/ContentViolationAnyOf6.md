# ContentViolationAnyOf6


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**tag** | **str** |  | 
**channel_id** | **str** |  | 
**platform** | [**Platform**](Platform.md) |  | 
**var_field** | **str** |  | 

## Example

```python
from peal.models.content_violation_any_of6 import ContentViolationAnyOf6

# TODO update the JSON string below
json = "{}"
# create an instance of ContentViolationAnyOf6 from a JSON string
content_violation_any_of6_instance = ContentViolationAnyOf6.from_json(json)
# print the JSON string representation of the object
print(ContentViolationAnyOf6.to_json())

# convert the object into a dict
content_violation_any_of6_dict = content_violation_any_of6_instance.to_dict()
# create an instance of ContentViolationAnyOf6 from a dict
content_violation_any_of6_from_dict = ContentViolationAnyOf6.from_dict(content_violation_any_of6_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


