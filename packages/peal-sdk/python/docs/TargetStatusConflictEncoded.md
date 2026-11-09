# TargetStatusConflictEncoded


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**tag** | **str** |  | 
**status** | [**PostTargetStatus**](PostTargetStatus.md) |  | 

## Example

```python
from peal.models.target_status_conflict_encoded import TargetStatusConflictEncoded

# TODO update the JSON string below
json = "{}"
# create an instance of TargetStatusConflictEncoded from a JSON string
target_status_conflict_encoded_instance = TargetStatusConflictEncoded.from_json(json)
# print the JSON string representation of the object
print(TargetStatusConflictEncoded.to_json())

# convert the object into a dict
target_status_conflict_encoded_dict = target_status_conflict_encoded_instance.to_dict()
# create an instance of TargetStatusConflictEncoded from a dict
target_status_conflict_encoded_from_dict = TargetStatusConflictEncoded.from_dict(target_status_conflict_encoded_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


