# ConnectablePlatforms


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**platforms** | [**List[Platform]**](Platform.md) |  | 

## Example

```python
from peal.models.connectable_platforms import ConnectablePlatforms

# TODO update the JSON string below
json = "{}"
# create an instance of ConnectablePlatforms from a JSON string
connectable_platforms_instance = ConnectablePlatforms.from_json(json)
# print the JSON string representation of the object
print(ConnectablePlatforms.to_json())

# convert the object into a dict
connectable_platforms_dict = connectable_platforms_instance.to_dict()
# create an instance of ConnectablePlatforms from a dict
connectable_platforms_from_dict = ConnectablePlatforms.from_dict(connectable_platforms_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


