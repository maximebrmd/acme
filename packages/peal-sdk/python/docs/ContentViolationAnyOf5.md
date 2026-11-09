# ContentViolationAnyOf5


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**tag** | **str** |  | 
**channel_id** | **str** |  | 
**platform** | [**Platform**](Platform.md) |  | 
**var_field** | **str** |  | 
**length** | **int** |  | 
**maximum** | **int** |  | 

## Example

```python
from peal.models.content_violation_any_of5 import ContentViolationAnyOf5

# TODO update the JSON string below
json = "{}"
# create an instance of ContentViolationAnyOf5 from a JSON string
content_violation_any_of5_instance = ContentViolationAnyOf5.from_json(json)
# print the JSON string representation of the object
print(ContentViolationAnyOf5.to_json())

# convert the object into a dict
content_violation_any_of5_dict = content_violation_any_of5_instance.to_dict()
# create an instance of ContentViolationAnyOf5 from a dict
content_violation_any_of5_from_dict = ContentViolationAnyOf5.from_dict(content_violation_any_of5_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


