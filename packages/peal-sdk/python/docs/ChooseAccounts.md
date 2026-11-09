# ChooseAccounts


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**account_ids** | **List[str]** |  | 
**selection** | **str** |  | 

## Example

```python
from peal.models.choose_accounts import ChooseAccounts

# TODO update the JSON string below
json = "{}"
# create an instance of ChooseAccounts from a JSON string
choose_accounts_instance = ChooseAccounts.from_json(json)
# print the JSON string representation of the object
print(ChooseAccounts.to_json())

# convert the object into a dict
choose_accounts_dict = choose_accounts_instance.to_dict()
# create an instance of ChooseAccounts from a dict
choose_accounts_from_dict = ChooseAccounts.from_dict(choose_accounts_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


