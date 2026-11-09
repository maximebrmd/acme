# ConnectFailedEncoded


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**tag** | **str** |  | 
**reason** | [**ConnectFailureReason**](ConnectFailureReason.md) |  | 

## Example

```python
from peal.models.connect_failed_encoded import ConnectFailedEncoded

# TODO update the JSON string below
json = "{}"
# create an instance of ConnectFailedEncoded from a JSON string
connect_failed_encoded_instance = ConnectFailedEncoded.from_json(json)
# print the JSON string representation of the object
print(ConnectFailedEncoded.to_json())

# convert the object into a dict
connect_failed_encoded_dict = connect_failed_encoded_instance.to_dict()
# create an instance of ConnectFailedEncoded from a dict
connect_failed_encoded_from_dict = ConnectFailedEncoded.from_dict(connect_failed_encoded_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


