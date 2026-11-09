# ContentViolationAnyOf12


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
from peal.models.content_violation_any_of12 import ContentViolationAnyOf12

# TODO update the JSON string below
json = "{}"
# create an instance of ContentViolationAnyOf12 from a JSON string
content_violation_any_of12_instance = ContentViolationAnyOf12.from_json(json)
# print the JSON string representation of the object
print(ContentViolationAnyOf12.to_json())

# convert the object into a dict
content_violation_any_of12_dict = content_violation_any_of12_instance.to_dict()
# create an instance of ContentViolationAnyOf12 from a dict
content_violation_any_of12_from_dict = ContentViolationAnyOf12.from_dict(content_violation_any_of12_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


