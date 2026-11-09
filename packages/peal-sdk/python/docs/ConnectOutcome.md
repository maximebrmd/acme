# ConnectOutcome


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**tag** | **str** |  | 
**channel** | [**Channel**](Channel.md) |  | 
**accounts** | [**List[ChoosableAccount]**](ChoosableAccount.md) |  | 
**expires_at** | **str** |  | 
**selection** | **str** |  | 

## Example

```python
from peal.models.connect_outcome import ConnectOutcome

# TODO update the JSON string below
json = "{}"
# create an instance of ConnectOutcome from a JSON string
connect_outcome_instance = ConnectOutcome.from_json(json)
# print the JSON string representation of the object
print(ConnectOutcome.to_json())

# convert the object into a dict
connect_outcome_dict = connect_outcome_instance.to_dict()
# create an instance of ConnectOutcome from a dict
connect_outcome_from_dict = ConnectOutcome.from_dict(connect_outcome_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


