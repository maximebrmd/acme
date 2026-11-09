# ContentViolationAnyOf10


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
from peal.models.content_violation_any_of10 import ContentViolationAnyOf10

# TODO update the JSON string below
json = "{}"
# create an instance of ContentViolationAnyOf10 from a JSON string
content_violation_any_of10_instance = ContentViolationAnyOf10.from_json(json)
# print the JSON string representation of the object
print(ContentViolationAnyOf10.to_json())

# convert the object into a dict
content_violation_any_of10_dict = content_violation_any_of10_instance.to_dict()
# create an instance of ContentViolationAnyOf10 from a dict
content_violation_any_of10_from_dict = ContentViolationAnyOf10.from_dict(content_violation_any_of10_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


