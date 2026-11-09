# Channel


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**avatar_url** | **str** |  | 
**display_name** | **str** |  | 
**handle** | **str** |  | 
**id** | **str** |  | 
**platform** | [**Platform**](Platform.md) |  | 
**status** | [**ChannelStatus**](ChannelStatus.md) |  | 
**token_expires_at** | **str** |  | 

## Example

```python
from peal.models.channel import Channel

# TODO update the JSON string below
json = "{}"
# create an instance of Channel from a JSON string
channel_instance = Channel.from_json(json)
# print the JSON string representation of the object
print(Channel.to_json())

# convert the object into a dict
channel_dict = channel_instance.to_dict()
# create an instance of Channel from a dict
channel_from_dict = Channel.from_dict(channel_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


