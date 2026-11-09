# NoticeChannel


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**handle** | **str** |  | 
**platform** | [**Platform**](Platform.md) |  | 

## Example

```python
from peal.models.notice_channel import NoticeChannel

# TODO update the JSON string below
json = "{}"
# create an instance of NoticeChannel from a JSON string
notice_channel_instance = NoticeChannel.from_json(json)
# print the JSON string representation of the object
print(NoticeChannel.to_json())

# convert the object into a dict
notice_channel_dict = notice_channel_instance.to_dict()
# create an instance of NoticeChannel from a dict
notice_channel_from_dict = NoticeChannel.from_dict(notice_channel_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


