# UnauthenticatedEncoded


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**tag** | **str** |  | 

## Example

```python
from peal.models.unauthenticated_encoded import UnauthenticatedEncoded

# TODO update the JSON string below
json = "{}"
# create an instance of UnauthenticatedEncoded from a JSON string
unauthenticated_encoded_instance = UnauthenticatedEncoded.from_json(json)
# print the JSON string representation of the object
print(UnauthenticatedEncoded.to_json())

# convert the object into a dict
unauthenticated_encoded_dict = unauthenticated_encoded_instance.to_dict()
# create an instance of UnauthenticatedEncoded from a dict
unauthenticated_encoded_from_dict = UnauthenticatedEncoded.from_dict(unauthenticated_encoded_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


