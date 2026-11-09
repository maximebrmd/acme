# UploadTargetAnyOf


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**tag** | **str** |  | 
**expires_at** | **str** |  | 
**request** | [**SignedRequest**](SignedRequest.md) |  | 

## Example

```python
from peal.models.upload_target_any_of import UploadTargetAnyOf

# TODO update the JSON string below
json = "{}"
# create an instance of UploadTargetAnyOf from a JSON string
upload_target_any_of_instance = UploadTargetAnyOf.from_json(json)
# print the JSON string representation of the object
print(UploadTargetAnyOf.to_json())

# convert the object into a dict
upload_target_any_of_dict = upload_target_any_of_instance.to_dict()
# create an instance of UploadTargetAnyOf from a dict
upload_target_any_of_from_dict = UploadTargetAnyOf.from_dict(upload_target_any_of_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


