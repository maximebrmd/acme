# ContentViolation


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**tag** | **str** |  | 
**channel_id** | **str** |  | 
**platform** | [**Platform**](Platform.md) |  | 
**options_platform** | [**Platform**](Platform.md) |  | 
**var_field** | **str** |  | 
**length** | **int** |  | 
**maximum** | **int** |  | 
**unit** | [**TextUnit**](TextUnit.md) |  | 
**characters** | **List[str]** |  | 
**count** | **int** |  | 
**media_id** | **str** |  | 
**content_type** | [**MediaContentType**](MediaContentType.md) |  | 
**byte_size** | **int** |  | 
**minimum** | [**ContentViolationAnyOf24Maximum**](ContentViolationAnyOf24Maximum.md) |  | 
**duration_ms** | **int** |  | 
**maximum_ms** | **int** |  | 
**minimum_ms** | **int** |  | 
**height** | **int** |  | 
**width** | **int** |  | 

## Example

```python
from peal.models.content_violation import ContentViolation

# TODO update the JSON string below
json = "{}"
# create an instance of ContentViolation from a JSON string
content_violation_instance = ContentViolation.from_json(json)
# print the JSON string representation of the object
print(ContentViolation.to_json())

# convert the object into a dict
content_violation_dict = content_violation_instance.to_dict()
# create an instance of ContentViolation from a dict
content_violation_from_dict = ContentViolation.from_dict(content_violation_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


