# UploadTarget


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**tag** | **str** |  | 
**expires_at** | **str** |  | 
**request** | [**SignedRequest**](SignedRequest.md) |  | 
**part_size** | **int** |  | 
**parts** | [**List[UploadPart]**](UploadPart.md) |  | 

## Example

```python
from peal.models.upload_target import UploadTarget

# TODO update the JSON string below
json = "{}"
# create an instance of UploadTarget from a JSON string
upload_target_instance = UploadTarget.from_json(json)
# print the JSON string representation of the object
print(UploadTarget.to_json())

# convert the object into a dict
upload_target_dict = upload_target_instance.to_dict()
# create an instance of UploadTarget from a dict
upload_target_from_dict = UploadTarget.from_dict(upload_target_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


