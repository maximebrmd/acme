# ConnectChannel


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**connection** | [**InstagramConnection**](InstagramConnection.md) |  | [optional] 
**handle** | **str** |  | [optional] 
**instance** | **str** |  | [optional] 

## Example

```python
from peal.models.connect_channel import ConnectChannel

# TODO update the JSON string below
json = "{}"
# create an instance of ConnectChannel from a JSON string
connect_channel_instance = ConnectChannel.from_json(json)
# print the JSON string representation of the object
print(ConnectChannel.to_json())

# convert the object into a dict
connect_channel_dict = connect_channel_instance.to_dict()
# create an instance of ConnectChannel from a dict
connect_channel_from_dict = ConnectChannel.from_dict(connect_channel_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


