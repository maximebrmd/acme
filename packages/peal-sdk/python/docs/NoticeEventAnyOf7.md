# NoticeEventAnyOf7


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**tag** | **str** |  | 
**plan** | [**PaidPlan**](PaidPlan.md) |  | 
**price** | [**Money**](Money.md) |  | 
**renews_at** | **str** |  | 

## Example

```python
from peal.models.notice_event_any_of7 import NoticeEventAnyOf7

# TODO update the JSON string below
json = "{}"
# create an instance of NoticeEventAnyOf7 from a JSON string
notice_event_any_of7_instance = NoticeEventAnyOf7.from_json(json)
# print the JSON string representation of the object
print(NoticeEventAnyOf7.to_json())

# convert the object into a dict
notice_event_any_of7_dict = notice_event_any_of7_instance.to_dict()
# create an instance of NoticeEventAnyOf7 from a dict
notice_event_any_of7_from_dict = NoticeEventAnyOf7.from_dict(notice_event_any_of7_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


