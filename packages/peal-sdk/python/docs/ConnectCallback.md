# ConnectCallback


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**code** | **str** |  | [optional] 
**error** | **str** |  | [optional] 
**iss** | **str** |  | [optional] 
**state** | **str** |  | 

## Example

```python
from peal.models.connect_callback import ConnectCallback

# TODO update the JSON string below
json = "{}"
# create an instance of ConnectCallback from a JSON string
connect_callback_instance = ConnectCallback.from_json(json)
# print the JSON string representation of the object
print(ConnectCallback.to_json())

# convert the object into a dict
connect_callback_dict = connect_callback_instance.to_dict()
# create an instance of ConnectCallback from a dict
connect_callback_from_dict = ConnectCallback.from_dict(connect_callback_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


