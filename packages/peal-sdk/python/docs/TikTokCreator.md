# TikTokCreator


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**avatar_url** | **str** |  | 
**comment_disabled** | **bool** |  | 
**duet_disabled** | **bool** |  | 
**max_video_duration_ms** | **int** |  | 
**nickname** | **str** |  | 
**privacy_levels** | [**List[TikTokPrivacyLevel]**](TikTokPrivacyLevel.md) |  | 
**stitch_disabled** | **bool** |  | 
**username** | **str** |  | 

## Example

```python
from peal.models.tik_tok_creator import TikTokCreator

# TODO update the JSON string below
json = "{}"
# create an instance of TikTokCreator from a JSON string
tik_tok_creator_instance = TikTokCreator.from_json(json)
# print the JSON string representation of the object
print(TikTokCreator.to_json())

# convert the object into a dict
tik_tok_creator_dict = tik_tok_creator_instance.to_dict()
# create an instance of TikTokCreator from a dict
tik_tok_creator_from_dict = TikTokCreator.from_dict(tik_tok_creator_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


