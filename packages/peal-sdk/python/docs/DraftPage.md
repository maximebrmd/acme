# DraftPage


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**items** | [**List[Post]**](Post.md) |  | 
**next_cursor** | **str** |  | 

## Example

```python
from peal.models.draft_page import DraftPage

# TODO update the JSON string below
json = "{}"
# create an instance of DraftPage from a JSON string
draft_page_instance = DraftPage.from_json(json)
# print the JSON string representation of the object
print(DraftPage.to_json())

# convert the object into a dict
draft_page_dict = draft_page_instance.to_dict()
# create an instance of DraftPage from a dict
draft_page_from_dict = DraftPage.from_dict(draft_page_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


