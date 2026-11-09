# TargetOptions

What a post says on a channel that only its platform knows, tagged by `platform`. Platforms without options take none.

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
**ai_generated** | **bool** |  | [optional] 
**brand_content** | **bool** |  | [optional] 
**brand_organic** | **bool** |  | [optional] 
**commercial_content** | **bool** |  | [optional] 
**disable_comment** | **bool** |  | [optional] 
**disable_duet** | **bool** |  | [optional] 
**disable_stitch** | **bool** |  | [optional] 
**privacy_level** | [**TikTokPrivacyLevel**](TikTokPrivacyLevel.md) |  | [optional] 

## Example

```python
from peal.models.target_options import TargetOptions

# TODO update the JSON string below
json = "{}"
# create an instance of TargetOptions from a JSON string
target_options_instance = TargetOptions.from_json(json)
# print the JSON string representation of the object
print(TargetOptions.to_json())

# convert the object into a dict
target_options_dict = target_options_instance.to_dict()
# create an instance of TargetOptions from a dict
target_options_from_dict = TargetOptions.from_dict(target_options_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


