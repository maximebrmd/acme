# PreparedUpload


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**media** | [**Media**](Media.md) |  | 
**upload** | [**UploadTarget**](UploadTarget.md) |  | 

## Example

```python
from peal.models.prepared_upload import PreparedUpload

# TODO update the JSON string below
json = "{}"
# create an instance of PreparedUpload from a JSON string
prepared_upload_instance = PreparedUpload.from_json(json)
# print the JSON string representation of the object
print(PreparedUpload.to_json())

# convert the object into a dict
prepared_upload_dict = prepared_upload_instance.to_dict()
# create an instance of PreparedUpload from a dict
prepared_upload_from_dict = PreparedUpload.from_dict(prepared_upload_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


