# TikTokAccount


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**posting** | [**TikTokAccountPosting**](TikTokAccountPosting.md) |  | 
**takes_photos** | **bool** |  | 

## Example

```python
from peal.models.tik_tok_account import TikTokAccount

# TODO update the JSON string below
json = "{}"
# create an instance of TikTokAccount from a JSON string
tik_tok_account_instance = TikTokAccount.from_json(json)
# print the JSON string representation of the object
print(TikTokAccount.to_json())

# convert the object into a dict
tik_tok_account_dict = tik_tok_account_instance.to_dict()
# create an instance of TikTokAccount from a dict
tik_tok_account_from_dict = TikTokAccount.from_dict(tik_tok_account_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


