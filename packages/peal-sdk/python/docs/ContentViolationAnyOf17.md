# ContentViolationAnyOf17


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**tag** | **str** |  | 
**channel_id** | **str** |  | 
**platform** | [**Platform**](Platform.md) |  | 
**media_id** | **str** |  | 
**content_type** | [**MediaContentType**](MediaContentType.md) |  | 

## Example

```python
from peal.models.content_violation_any_of17 import ContentViolationAnyOf17

# TODO update the JSON string below
json = "{}"
# create an instance of ContentViolationAnyOf17 from a JSON string
content_violation_any_of17_instance = ContentViolationAnyOf17.from_json(json)
# print the JSON string representation of the object
print(ContentViolationAnyOf17.to_json())

# convert the object into a dict
content_violation_any_of17_dict = content_violation_any_of17_instance.to_dict()
# create an instance of ContentViolationAnyOf17 from a dict
content_violation_any_of17_from_dict = ContentViolationAnyOf17.from_dict(content_violation_any_of17_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


