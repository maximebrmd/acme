# NewUpload


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**alt_text** | **str** |  | [optional] 
**byte_size** | **int** |  | 
**content_type** | **str** |  | 

## Example

```python
from peal.models.new_upload import NewUpload

# TODO update the JSON string below
json = "{}"
# create an instance of NewUpload from a JSON string
new_upload_instance = NewUpload.from_json(json)
# print the JSON string representation of the object
print(NewUpload.to_json())

# convert the object into a dict
new_upload_dict = new_upload_instance.to_dict()
# create an instance of NewUpload from a dict
new_upload_from_dict = NewUpload.from_dict(new_upload_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


