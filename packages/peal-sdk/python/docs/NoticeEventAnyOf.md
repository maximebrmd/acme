# NoticeEventAnyOf


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**tag** | **str** |  | 
**channel** | [**NoticeChannel**](NoticeChannel.md) |  | 
**permalink** | **str** |  | 
**post_id** | **str** |  | 

## Example

```python
from peal.models.notice_event_any_of import NoticeEventAnyOf

# TODO update the JSON string below
json = "{}"
# create an instance of NoticeEventAnyOf from a JSON string
notice_event_any_of_instance = NoticeEventAnyOf.from_json(json)
# print the JSON string representation of the object
print(NoticeEventAnyOf.to_json())

# convert the object into a dict
notice_event_any_of_dict = notice_event_any_of_instance.to_dict()
# create an instance of NoticeEventAnyOf from a dict
notice_event_any_of_from_dict = NoticeEventAnyOf.from_dict(notice_event_any_of_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


