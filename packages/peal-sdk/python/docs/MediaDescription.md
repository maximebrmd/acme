# MediaDescription


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**alt_text** | **str** |  | 

## Example

```python
from peal.models.media_description import MediaDescription

# TODO update the JSON string below
json = "{}"
# create an instance of MediaDescription from a JSON string
media_description_instance = MediaDescription.from_json(json)
# print the JSON string representation of the object
print(MediaDescription.to_json())

# convert the object into a dict
media_description_dict = media_description_instance.to_dict()
# create an instance of MediaDescription from a dict
media_description_from_dict = MediaDescription.from_dict(media_description_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


