# Notice


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**created_at** | **str** |  | 
**event** | [**NoticeEvent**](NoticeEvent.md) |  | 
**id** | **str** |  | 
**read_at** | **str** |  | 
**workspace_id** | **str** |  | 

## Example

```python
from peal.models.notice import Notice

# TODO update the JSON string below
json = "{}"
# create an instance of Notice from a JSON string
notice_instance = Notice.from_json(json)
# print the JSON string representation of the object
print(Notice.to_json())

# convert the object into a dict
notice_dict = notice_instance.to_dict()
# create an instance of Notice from a dict
notice_from_dict = Notice.from_dict(notice_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


