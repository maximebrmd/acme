# PostContentInvalidEncoded


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**tag** | **str** |  | 
**violations** | [**List[ContentViolation]**](ContentViolation.md) |  | 

## Example

```python
from peal.models.post_content_invalid_encoded import PostContentInvalidEncoded

# TODO update the JSON string below
json = "{}"
# create an instance of PostContentInvalidEncoded from a JSON string
post_content_invalid_encoded_instance = PostContentInvalidEncoded.from_json(json)
# print the JSON string representation of the object
print(PostContentInvalidEncoded.to_json())

# convert the object into a dict
post_content_invalid_encoded_dict = post_content_invalid_encoded_instance.to_dict()
# create an instance of PostContentInvalidEncoded from a dict
post_content_invalid_encoded_from_dict = PostContentInvalidEncoded.from_dict(post_content_invalid_encoded_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


