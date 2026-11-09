# MeUser


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**email** | **str** |  | 
**email_verified** | **bool** |  | 
**id** | **str** |  | 
**image** | **str** |  | 
**locale** | **str** |  | 
**name** | **str** |  | 

## Example

```python
from peal.models.me_user import MeUser

# TODO update the JSON string below
json = "{}"
# create an instance of MeUser from a JSON string
me_user_instance = MeUser.from_json(json)
# print the JSON string representation of the object
print(MeUser.to_json())

# convert the object into a dict
me_user_dict = me_user_instance.to_dict()
# create an instance of MeUser from a dict
me_user_from_dict = MeUser.from_dict(me_user_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


