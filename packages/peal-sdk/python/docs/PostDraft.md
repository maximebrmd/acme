# PostDraft


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**channel_ids** | **List[str]** |  | 
**content** | [**PostContent**](PostContent.md) |  | 
**options** | [**List[ChannelOptions]**](ChannelOptions.md) |  | [optional] 

## Example

```python
from peal.models.post_draft import PostDraft

# TODO update the JSON string below
json = "{}"
# create an instance of PostDraft from a JSON string
post_draft_instance = PostDraft.from_json(json)
# print the JSON string representation of the object
print(PostDraft.to_json())

# convert the object into a dict
post_draft_dict = post_draft_instance.to_dict()
# create an instance of PostDraft from a dict
post_draft_from_dict = PostDraft.from_dict(post_draft_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


