# NotificationPreferencesEmail


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**channel_reconnect** | **bool** |  | 
**post_failed** | **bool** |  | 
**post_published** | **bool** |  | 
**post_unconfirmed** | **bool** |  | 

## Example

```python
from peal.models.notification_preferences_email import NotificationPreferencesEmail

# TODO update the JSON string below
json = "{}"
# create an instance of NotificationPreferencesEmail from a JSON string
notification_preferences_email_instance = NotificationPreferencesEmail.from_json(json)
# print the JSON string representation of the object
print(NotificationPreferencesEmail.to_json())

# convert the object into a dict
notification_preferences_email_dict = notification_preferences_email_instance.to_dict()
# create an instance of NotificationPreferencesEmail from a dict
notification_preferences_email_from_dict = NotificationPreferencesEmail.from_dict(notification_preferences_email_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


