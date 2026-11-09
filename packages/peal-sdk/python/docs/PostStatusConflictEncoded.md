# PostStatusConflictEncoded


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**tag** | **str** |  | 
**status** | [**PostStatus**](PostStatus.md) |  | 

## Example

```python
from peal.models.post_status_conflict_encoded import PostStatusConflictEncoded

# TODO update the JSON string below
json = "{}"
# create an instance of PostStatusConflictEncoded from a JSON string
post_status_conflict_encoded_instance = PostStatusConflictEncoded.from_json(json)
# print the JSON string representation of the object
print(PostStatusConflictEncoded.to_json())

# convert the object into a dict
post_status_conflict_encoded_dict = post_status_conflict_encoded_instance.to_dict()
# create an instance of PostStatusConflictEncoded from a dict
post_status_conflict_encoded_from_dict = PostStatusConflictEncoded.from_dict(post_status_conflict_encoded_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


