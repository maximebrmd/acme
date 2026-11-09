# YouTubeOptions

How a post goes out on a YouTube channel. Scheduling needs `title` and `madeForKids`.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**category_id** | **str** |  | [optional] 
**contains_synthetic_media** | **bool** |  | [optional] 
**made_for_kids** | **bool** |  | [optional] 
**notify_subscribers** | **bool** |  | [optional] 
**platform** | **str** |  | 
**privacy** | [**YouTubePrivacy**](YouTubePrivacy.md) |  | [optional] 
**tags** | **List[str]** |  | [optional] 
**title** | **str** |  | [optional] 

## Example

```python
from peal.models.you_tube_options import YouTubeOptions

# TODO update the JSON string below
json = "{}"
# create an instance of YouTubeOptions from a JSON string
you_tube_options_instance = YouTubeOptions.from_json(json)
# print the JSON string representation of the object
print(YouTubeOptions.to_json())

# convert the object into a dict
you_tube_options_dict = you_tube_options_instance.to_dict()
# create an instance of YouTubeOptions from a dict
you_tube_options_from_dict = YouTubeOptions.from_dict(you_tube_options_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


