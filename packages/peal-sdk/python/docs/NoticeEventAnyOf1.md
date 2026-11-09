# NoticeEventAnyOf1


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**tag** | **str** |  | 
**channel** | [**NoticeChannel**](NoticeChannel.md) |  | 
**post_id** | **str** |  | 
**reason** | [**FailureReason**](FailureReason.md) |  | 

## Example

```python
from peal.models.notice_event_any_of1 import NoticeEventAnyOf1

# TODO update the JSON string below
json = "{}"
# create an instance of NoticeEventAnyOf1 from a JSON string
notice_event_any_of1_instance = NoticeEventAnyOf1.from_json(json)
# print the JSON string representation of the object
print(NoticeEventAnyOf1.to_json())

# convert the object into a dict
notice_event_any_of1_dict = notice_event_any_of1_instance.to_dict()
# create an instance of NoticeEventAnyOf1 from a dict
notice_event_any_of1_from_dict = NoticeEventAnyOf1.from_dict(notice_event_any_of1_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


