# Media


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**alt_text** | **str** |  | 
**byte_size** | **int** |  | 
**codec** | **str** |  | 
**content_type** | [**MediaContentType**](MediaContentType.md) |  | 
**created_at** | **str** |  | 
**dimensions** | [**MediaDimensions**](MediaDimensions.md) |  | 
**duration_ms** | **int** |  | 
**id** | **str** |  | 
**kind** | [**MediaKind**](MediaKind.md) |  | 
**status** | [**MediaStatus**](MediaStatus.md) |  | 
**updated_at** | **str** |  | 
**url** | **str** |  | 

## Example

```python
from peal.models.media import Media

# TODO update the JSON string below
json = "{}"
# create an instance of Media from a JSON string
media_instance = Media.from_json(json)
# print the JSON string representation of the object
print(Media.to_json())

# convert the object into a dict
media_dict = media_instance.to_dict()
# create an instance of Media from a dict
media_from_dict = Media.from_dict(media_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


