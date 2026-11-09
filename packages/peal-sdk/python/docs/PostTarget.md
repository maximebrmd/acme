# PostTarget


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**channel_id** | **str** |  | 
**failure_reason** | [**FailureReason**](FailureReason.md) |  | 
**id** | **str** |  | 
**kept_private** | **bool** |  | [optional] 
**options** | [**TargetOptions**](TargetOptions.md) |  | 
**permalink** | **str** |  | 
**published_at** | **str** |  | 
**round** | **int** |  | 
**status** | [**PostTargetStatus**](PostTargetStatus.md) |  | 
**unconfirmed_reason** | [**UnconfirmedReason**](UnconfirmedReason.md) |  | 

## Example

```python
from peal.models.post_target import PostTarget

# TODO update the JSON string below
json = "{}"
# create an instance of PostTarget from a JSON string
post_target_instance = PostTarget.from_json(json)
# print the JSON string representation of the object
print(PostTarget.to_json())

# convert the object into a dict
post_target_dict = post_target_instance.to_dict()
# create an instance of PostTarget from a dict
post_target_from_dict = PostTarget.from_dict(post_target_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


