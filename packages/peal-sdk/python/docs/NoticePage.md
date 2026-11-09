# NoticePage


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**items** | [**List[Notice]**](Notice.md) |  | 
**next_cursor** | **str** |  | 

## Example

```python
from peal.models.notice_page import NoticePage

# TODO update the JSON string below
json = "{}"
# create an instance of NoticePage from a JSON string
notice_page_instance = NoticePage.from_json(json)
# print the JSON string representation of the object
print(NoticePage.to_json())

# convert the object into a dict
notice_page_dict = notice_page_instance.to_dict()
# create an instance of NoticePage from a dict
notice_page_from_dict = NoticePage.from_dict(notice_page_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


