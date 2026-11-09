# TextOverride


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**channel_id** | **str** |  | 
**text** | **str** |  | 

## Example

```python
from peal.models.text_override import TextOverride

# TODO update the JSON string below
json = "{}"
# create an instance of TextOverride from a JSON string
text_override_instance = TextOverride.from_json(json)
# print the JSON string representation of the object
print(TextOverride.to_json())

# convert the object into a dict
text_override_dict = text_override_instance.to_dict()
# create an instance of TextOverride from a dict
text_override_from_dict = TextOverride.from_dict(text_override_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


