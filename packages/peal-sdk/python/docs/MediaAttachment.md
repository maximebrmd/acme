# MediaAttachment


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**alt_text** | **str** |  | 
**media_id** | **str** |  | 

## Example

```python
from peal.models.media_attachment import MediaAttachment

# TODO update the JSON string below
json = "{}"
# create an instance of MediaAttachment from a JSON string
media_attachment_instance = MediaAttachment.from_json(json)
# print the JSON string representation of the object
print(MediaAttachment.to_json())

# convert the object into a dict
media_attachment_dict = media_attachment_instance.to_dict()
# create an instance of MediaAttachment from a dict
media_attachment_from_dict = MediaAttachment.from_dict(media_attachment_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


