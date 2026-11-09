# UploadRejectedEncoded


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**tag** | **str** |  | 
**reason** | [**RejectionReason**](RejectionReason.md) |  | 

## Example

```python
from peal.models.upload_rejected_encoded import UploadRejectedEncoded

# TODO update the JSON string below
json = "{}"
# create an instance of UploadRejectedEncoded from a JSON string
upload_rejected_encoded_instance = UploadRejectedEncoded.from_json(json)
# print the JSON string representation of the object
print(UploadRejectedEncoded.to_json())

# convert the object into a dict
upload_rejected_encoded_dict = upload_rejected_encoded_instance.to_dict()
# create an instance of UploadRejectedEncoded from a dict
upload_rejected_encoded_from_dict = UploadRejectedEncoded.from_dict(upload_rejected_encoded_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


