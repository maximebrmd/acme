# NoticeEvent


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**tag** | **str** |  | 
**channel** | [**NoticeChannel**](NoticeChannel.md) |  | 
**permalink** | **str** |  | 
**post_id** | **str** |  | 
**reason** | [**FailureReason**](FailureReason.md) |  | 
**expires_at** | **str** |  | 
**interval** | [**BillingInterval**](BillingInterval.md) |  | 
**plan** | [**PaidPlan**](PaidPlan.md) |  | 
**price** | [**Money**](Money.md) |  | 
**started_at** | **str** |  | 
**trial_end** | **str** |  | 
**ends_at** | **str** |  | 
**renews_at** | **str** |  | 
**refunded** | [**Money**](Money.md) |  | 
**withdrawn_at** | **str** |  | 

## Example

```python
from peal.models.notice_event import NoticeEvent

# TODO update the JSON string below
json = "{}"
# create an instance of NoticeEvent from a JSON string
notice_event_instance = NoticeEvent.from_json(json)
# print the JSON string representation of the object
print(NoticeEvent.to_json())

# convert the object into a dict
notice_event_dict = notice_event_instance.to_dict()
# create an instance of NoticeEvent from a dict
notice_event_from_dict = NoticeEvent.from_dict(notice_event_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


