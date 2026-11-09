# ApiKey


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**created_at** | **str** |  | 
**expires_at** | **str** |  | 
**id** | **str** |  | 
**name** | **str** |  | 
**permissions** | [**List[Permission]**](Permission.md) |  | 
**start** | **str** |  | 

## Example

```python
from peal.models.api_key import ApiKey

# TODO update the JSON string below
json = "{}"
# create an instance of ApiKey from a JSON string
api_key_instance = ApiKey.from_json(json)
# print the JSON string representation of the object
print(ApiKey.to_json())

# convert the object into a dict
api_key_dict = api_key_instance.to_dict()
# create an instance of ApiKey from a dict
api_key_from_dict = ApiKey.from_dict(api_key_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


