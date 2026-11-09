# NoticeEventAnyOf5


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**tag** | **str** |  | 
**interval** | [**BillingInterval**](BillingInterval.md) |  | 
**plan** | [**PaidPlan**](PaidPlan.md) |  | 
**price** | [**Money**](Money.md) |  | 
**started_at** | **str** |  | 
**trial_end** | **str** |  | 

## Example

```python
from peal.models.notice_event_any_of5 import NoticeEventAnyOf5

# TODO update the JSON string below
json = "{}"
# create an instance of NoticeEventAnyOf5 from a JSON string
notice_event_any_of5_instance = NoticeEventAnyOf5.from_json(json)
# print the JSON string representation of the object
print(NoticeEventAnyOf5.to_json())

# convert the object into a dict
notice_event_any_of5_dict = notice_event_any_of5_instance.to_dict()
# create an instance of NoticeEventAnyOf5 from a dict
notice_event_any_of5_from_dict = NoticeEventAnyOf5.from_dict(notice_event_any_of5_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


