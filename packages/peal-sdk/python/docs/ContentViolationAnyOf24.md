# ContentViolationAnyOf24


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**tag** | **str** |  | 
**channel_id** | **str** |  | 
**platform** | [**Platform**](Platform.md) |  | 
**media_id** | **str** |  | 
**height** | **int** |  | 
**width** | **int** |  | 
**maximum** | [**ContentViolationAnyOf24Maximum**](ContentViolationAnyOf24Maximum.md) |  | 
**minimum** | [**ContentViolationAnyOf24Maximum**](ContentViolationAnyOf24Maximum.md) |  | 

## Example

```python
from peal.models.content_violation_any_of24 import ContentViolationAnyOf24

# TODO update the JSON string below
json = "{}"
# create an instance of ContentViolationAnyOf24 from a JSON string
content_violation_any_of24_instance = ContentViolationAnyOf24.from_json(json)
# print the JSON string representation of the object
print(ContentViolationAnyOf24.to_json())

# convert the object into a dict
content_violation_any_of24_dict = content_violation_any_of24_instance.to_dict()
# create an instance of ContentViolationAnyOf24 from a dict
content_violation_any_of24_from_dict = ContentViolationAnyOf24.from_dict(content_violation_any_of24_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


