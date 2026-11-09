# ConnectOutcomeAnyOf1


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**tag** | **str** |  | 
**accounts** | [**List[ChoosableAccount]**](ChoosableAccount.md) |  | 
**expires_at** | **str** |  | 
**selection** | **str** |  | 

## Example

```python
from peal.models.connect_outcome_any_of1 import ConnectOutcomeAnyOf1

# TODO update the JSON string below
json = "{}"
# create an instance of ConnectOutcomeAnyOf1 from a JSON string
connect_outcome_any_of1_instance = ConnectOutcomeAnyOf1.from_json(json)
# print the JSON string representation of the object
print(ConnectOutcomeAnyOf1.to_json())

# convert the object into a dict
connect_outcome_any_of1_dict = connect_outcome_any_of1_instance.to_dict()
# create an instance of ConnectOutcomeAnyOf1 from a dict
connect_outcome_any_of1_from_dict = ConnectOutcomeAnyOf1.from_dict(connect_outcome_any_of1_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


