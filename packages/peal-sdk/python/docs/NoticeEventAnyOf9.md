# NoticeEventAnyOf9


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**tag** | **str** |  | 
**plan** | [**PaidPlan**](PaidPlan.md) |  | 
**refunded** | [**Money**](Money.md) |  | 
**withdrawn_at** | **str** |  | 

## Example

```python
from peal.models.notice_event_any_of9 import NoticeEventAnyOf9

# TODO update the JSON string below
json = "{}"
# create an instance of NoticeEventAnyOf9 from a JSON string
notice_event_any_of9_instance = NoticeEventAnyOf9.from_json(json)
# print the JSON string representation of the object
print(NoticeEventAnyOf9.to_json())

# convert the object into a dict
notice_event_any_of9_dict = notice_event_any_of9_instance.to_dict()
# create an instance of NoticeEventAnyOf9 from a dict
notice_event_any_of9_from_dict = NoticeEventAnyOf9.from_dict(notice_event_any_of9_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


