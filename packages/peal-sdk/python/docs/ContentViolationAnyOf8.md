# ContentViolationAnyOf8


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**tag** | **str** |  | 
**channel_id** | **str** |  | 
**platform** | [**Platform**](Platform.md) |  | 
**length** | **int** |  | 
**maximum** | **int** |  | 
**unit** | [**TextUnit**](TextUnit.md) |  | 

## Example

```python
from peal.models.content_violation_any_of8 import ContentViolationAnyOf8

# TODO update the JSON string below
json = "{}"
# create an instance of ContentViolationAnyOf8 from a JSON string
content_violation_any_of8_instance = ContentViolationAnyOf8.from_json(json)
# print the JSON string representation of the object
print(ContentViolationAnyOf8.to_json())

# convert the object into a dict
content_violation_any_of8_dict = content_violation_any_of8_instance.to_dict()
# create an instance of ContentViolationAnyOf8 from a dict
content_violation_any_of8_from_dict = ContentViolationAnyOf8.from_dict(content_violation_any_of8_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


