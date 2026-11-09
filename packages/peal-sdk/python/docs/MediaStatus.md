# MediaStatus


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**tag** | **str** |  | 
**probe** | [**ProbeState**](ProbeState.md) |  | 
**reason** | [**RejectionReason**](RejectionReason.md) |  | 

## Example

```python
from peal.models.media_status import MediaStatus

# TODO update the JSON string below
json = "{}"
# create an instance of MediaStatus from a JSON string
media_status_instance = MediaStatus.from_json(json)
# print the JSON string representation of the object
print(MediaStatus.to_json())

# convert the object into a dict
media_status_dict = media_status_instance.to_dict()
# create an instance of MediaStatus from a dict
media_status_from_dict = MediaStatus.from_dict(media_status_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


