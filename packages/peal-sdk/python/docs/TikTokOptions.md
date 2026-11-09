# TikTokOptions

How a post goes out on a TikTok account. Scheduling needs `privacyLevel`.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**ai_generated** | **bool** |  | [optional] 
**brand_content** | **bool** |  | [optional] 
**brand_organic** | **bool** |  | [optional] 
**commercial_content** | **bool** |  | [optional] 
**disable_comment** | **bool** |  | [optional] 
**disable_duet** | **bool** |  | [optional] 
**disable_stitch** | **bool** |  | [optional] 
**platform** | **str** |  | 
**privacy_level** | [**TikTokPrivacyLevel**](TikTokPrivacyLevel.md) |  | [optional] 

## Example

```python
from peal.models.tik_tok_options import TikTokOptions

# TODO update the JSON string below
json = "{}"
# create an instance of TikTokOptions from a JSON string
tik_tok_options_instance = TikTokOptions.from_json(json)
# print the JSON string representation of the object
print(TikTokOptions.to_json())

# convert the object into a dict
tik_tok_options_dict = tik_tok_options_instance.to_dict()
# create an instance of TikTokOptions from a dict
tik_tok_options_from_dict = TikTokOptions.from_dict(tik_tok_options_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


