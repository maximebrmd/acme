# ContentViolationAnyOf25


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**tag** | **str** |  | 
**channel_id** | **str** |  | 
**platform** | [**Platform**](Platform.md) |  | 
**media_id** | **str** |  | 
**length** | **int** |  | 
**maximum** | **int** |  | 

## Example

```python
from peal.models.content_violation_any_of25 import ContentViolationAnyOf25

# TODO update the JSON string below
json = "{}"
# create an instance of ContentViolationAnyOf25 from a JSON string
content_violation_any_of25_instance = ContentViolationAnyOf25.from_json(json)
# print the JSON string representation of the object
print(ContentViolationAnyOf25.to_json())

# convert the object into a dict
content_violation_any_of25_dict = content_violation_any_of25_instance.to_dict()
# create an instance of ContentViolationAnyOf25 from a dict
content_violation_any_of25_from_dict = ContentViolationAnyOf25.from_dict(content_violation_any_of25_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


