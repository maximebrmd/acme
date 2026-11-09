# ChannelOptions


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**channel_id** | **str** |  | 
**options** | [**TargetOptions**](TargetOptions.md) |  | 

## Example

```python
from peal.models.channel_options import ChannelOptions

# TODO update the JSON string below
json = "{}"
# create an instance of ChannelOptions from a JSON string
channel_options_instance = ChannelOptions.from_json(json)
# print the JSON string representation of the object
print(ChannelOptions.to_json())

# convert the object into a dict
channel_options_dict = channel_options_instance.to_dict()
# create an instance of ChannelOptions from a dict
channel_options_from_dict = ChannelOptions.from_dict(channel_options_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


