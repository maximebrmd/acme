# SignedRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**headers** | **Dict[str, str]** |  | 
**method** | **str** |  | 
**url** | **str** |  | 

## Example

```python
from peal.models.signed_request import SignedRequest

# TODO update the JSON string below
json = "{}"
# create an instance of SignedRequest from a JSON string
signed_request_instance = SignedRequest.from_json(json)
# print the JSON string representation of the object
print(SignedRequest.to_json())

# convert the object into a dict
signed_request_dict = signed_request_instance.to_dict()
# create an instance of SignedRequest from a dict
signed_request_from_dict = SignedRequest.from_dict(signed_request_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


