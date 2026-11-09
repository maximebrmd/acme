# ContentViolationAnyOf14


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
from peal.models.content_violation_any_of14 import ContentViolationAnyOf14

# TODO update the JSON string below
json = "{}"
# create an instance of ContentViolationAnyOf14 from a JSON string
content_violation_any_of14_instance = ContentViolationAnyOf14.from_json(json)
# print the JSON string representation of the object
print(ContentViolationAnyOf14.to_json())

# convert the object into a dict
content_violation_any_of14_dict = content_violation_any_of14_instance.to_dict()
# create an instance of ContentViolationAnyOf14 from a dict
content_violation_any_of14_from_dict = ContentViolationAnyOf14.from_dict(content_violation_any_of14_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


