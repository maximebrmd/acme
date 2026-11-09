# CreatedApiKey


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**api_key** | [**ApiKey**](ApiKey.md) |  | 
**key** | **str** |  | 

## Example

```python
from peal.models.created_api_key import CreatedApiKey

# TODO update the JSON string below
json = "{}"
# create an instance of CreatedApiKey from a JSON string
created_api_key_instance = CreatedApiKey.from_json(json)
# print the JSON string representation of the object
print(CreatedApiKey.to_json())

# convert the object into a dict
created_api_key_dict = created_api_key_instance.to_dict()
# create an instance of CreatedApiKey from a dict
created_api_key_from_dict = CreatedApiKey.from_dict(created_api_key_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


