# UnknownChannelsEncoded


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**tag** | **str** |  | 
**channel_ids** | **List[str]** |  | 

## Example

```python
from peal.models.unknown_channels_encoded import UnknownChannelsEncoded

# TODO update the JSON string below
json = "{}"
# create an instance of UnknownChannelsEncoded from a JSON string
unknown_channels_encoded_instance = UnknownChannelsEncoded.from_json(json)
# print the JSON string representation of the object
print(UnknownChannelsEncoded.to_json())

# convert the object into a dict
unknown_channels_encoded_dict = unknown_channels_encoded_instance.to_dict()
# create an instance of UnknownChannelsEncoded from a dict
unknown_channels_encoded_from_dict = UnknownChannelsEncoded.from_dict(unknown_channels_encoded_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


