# UploadTargetAnyOf1


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**tag** | **str** |  | 
**expires_at** | **str** |  | 
**part_size** | **int** |  | 
**parts** | [**List[UploadPart]**](UploadPart.md) |  | 

## Example

```python
from peal.models.upload_target_any_of1 import UploadTargetAnyOf1

# TODO update the JSON string below
json = "{}"
# create an instance of UploadTargetAnyOf1 from a JSON string
upload_target_any_of1_instance = UploadTargetAnyOf1.from_json(json)
# print the JSON string representation of the object
print(UploadTargetAnyOf1.to_json())

# convert the object into a dict
upload_target_any_of1_dict = upload_target_any_of1_instance.to_dict()
# create an instance of UploadTargetAnyOf1 from a dict
upload_target_any_of1_from_dict = UploadTargetAnyOf1.from_dict(upload_target_any_of1_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


