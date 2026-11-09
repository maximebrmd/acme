# ChoosableAccount


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**account_id** | **str** |  | 
**avatar_url** | **str** |  | 
**connected** | **bool** |  | 
**display_name** | **str** |  | 
**handle** | **str** |  | 

## Example

```python
from peal.models.choosable_account import ChoosableAccount

# TODO update the JSON string below
json = "{}"
# create an instance of ChoosableAccount from a JSON string
choosable_account_instance = ChoosableAccount.from_json(json)
# print the JSON string representation of the object
print(ChoosableAccount.to_json())

# convert the object into a dict
choosable_account_dict = choosable_account_instance.to_dict()
# create an instance of ChoosableAccount from a dict
choosable_account_from_dict = ChoosableAccount.from_dict(choosable_account_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


