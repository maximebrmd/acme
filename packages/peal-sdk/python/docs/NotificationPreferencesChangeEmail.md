# NotificationPreferencesChangeEmail


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**channel_reconnect** | **bool** |  | [optional] 
**post_failed** | **bool** |  | [optional] 
**post_published** | **bool** |  | [optional] 
**post_unconfirmed** | **bool** |  | [optional] 

## Example

```python
from peal.models.notification_preferences_change_email import NotificationPreferencesChangeEmail

# TODO update the JSON string below
json = "{}"
# create an instance of NotificationPreferencesChangeEmail from a JSON string
notification_preferences_change_email_instance = NotificationPreferencesChangeEmail.from_json(json)
# print the JSON string representation of the object
print(NotificationPreferencesChangeEmail.to_json())

# convert the object into a dict
notification_preferences_change_email_dict = notification_preferences_change_email_instance.to_dict()
# create an instance of NotificationPreferencesChangeEmail from a dict
notification_preferences_change_email_from_dict = NotificationPreferencesChangeEmail.from_dict(notification_preferences_change_email_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


