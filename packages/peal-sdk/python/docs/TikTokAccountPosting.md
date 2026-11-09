# TikTokAccountPosting


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**tag** | **str** |  | 
**creator** | [**TikTokCreator**](TikTokCreator.md) |  | 
**reason** | [**TikTokBlock**](TikTokBlock.md) |  | 

## Example

```python
from peal.models.tik_tok_account_posting import TikTokAccountPosting

# TODO update the JSON string below
json = "{}"
# create an instance of TikTokAccountPosting from a JSON string
tik_tok_account_posting_instance = TikTokAccountPosting.from_json(json)
# print the JSON string representation of the object
print(TikTokAccountPosting.to_json())

# convert the object into a dict
tik_tok_account_posting_dict = tik_tok_account_posting_instance.to_dict()
# create an instance of TikTokAccountPosting from a dict
tik_tok_account_posting_from_dict = TikTokAccountPosting.from_dict(tik_tok_account_posting_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


