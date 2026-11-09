# NotificationPreferencesChange


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**email** | [**NotificationPreferencesChangeEmail**](NotificationPreferencesChangeEmail.md) |  | [optional] 
**every_post** | **bool** |  | [optional] 

## Example

```python
from peal.models.notification_preferences_change import NotificationPreferencesChange

# TODO update the JSON string below
json = "{}"
# create an instance of NotificationPreferencesChange from a JSON string
notification_preferences_change_instance = NotificationPreferencesChange.from_json(json)
# print the JSON string representation of the object
print(NotificationPreferencesChange.to_json())

# convert the object into a dict
notification_preferences_change_dict = notification_preferences_change_instance.to_dict()
# create an instance of NotificationPreferencesChange from a dict
notification_preferences_change_from_dict = NotificationPreferencesChange.from_dict(notification_preferences_change_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


