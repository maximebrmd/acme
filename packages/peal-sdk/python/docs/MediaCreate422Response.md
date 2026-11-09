# MediaCreate422Response


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**tag** | **str** |  | 
**content_type** | **str** |  | 
**byte_size** | **int** |  | 
**kind** | **str** |  | 
**max_byte_size** | **int** |  | 
**max_length** | **int** |  | 

## Example

```python
from peal.models.media_create422_response import MediaCreate422Response

# TODO update the JSON string below
json = "{}"
# create an instance of MediaCreate422Response from a JSON string
media_create422_response_instance = MediaCreate422Response.from_json(json)
# print the JSON string representation of the object
print(MediaCreate422Response.to_json())

# convert the object into a dict
media_create422_response_dict = media_create422_response_instance.to_dict()
# create an instance of MediaCreate422Response from a dict
media_create422_response_from_dict = MediaCreate422Response.from_dict(media_create422_response_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


