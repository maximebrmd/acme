# peal.NotificationPreferencesApi

All URIs are relative to *https://app.peal.social*

Method | HTTP request | Description
------------- | ------------- | -------------
[**notification_preferences_get**](NotificationPreferencesApi.md#notification_preferences_get) | **GET** /api/me/notification-preferences | Get notification preferences
[**notification_preferences_update**](NotificationPreferencesApi.md#notification_preferences_update) | **PATCH** /api/me/notification-preferences | Change notification preferences


# **notification_preferences_get**
> NotificationPreferences notification_preferences_get()

Get notification preferences

Answers with which notices the user receives by email, and whether they hear about every post. Until they change it: failed and unconfirmed posts, and channels to reconnect, but not published posts, are emailed; and they hear only about the posts they wrote.

### Example

* Bearer Authentication (bearer):

```python
import peal
from peal.models.notification_preferences import NotificationPreferences
from peal.rest import ApiException
from pprint import pprint

# Defining the host is optional and defaults to https://app.peal.social
# See configuration.py for a list of all supported configuration parameters.
configuration = peal.Configuration(
    host = "https://app.peal.social"
)

# The client must configure the authentication and authorization parameters
# in accordance with the API server security policy.
# Examples for each auth method are provided below, use the example that
# satisfies your auth use case.

# Configure Bearer authorization: bearer
configuration = peal.Configuration(
    access_token = os.environ["BEARER_TOKEN"]
)

# Enter a context with an instance of the API client
with peal.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = peal.NotificationPreferencesApi(api_client)

    try:
        # Get notification preferences
        api_response = api_instance.notification_preferences_get()
        print("The response of NotificationPreferencesApi->notification_preferences_get:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling NotificationPreferencesApi->notification_preferences_get: %s\n" % e)
```



### Parameters

This endpoint does not need any parameter.

### Return type

[**NotificationPreferences**](NotificationPreferences.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | NotificationPreferences |  -  |
**401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
**403** | The credentials are valid but do not allow this request. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **notification_preferences_update**
> NotificationPreferences notification_preferences_update(notification_preferences_change)

Change notification preferences

Changes the preferences given, keeps the others, and answers with them all. Staff impersonating the user may not change them.

### Example

* Bearer Authentication (bearer):

```python
import peal
from peal.models.notification_preferences import NotificationPreferences
from peal.models.notification_preferences_change import NotificationPreferencesChange
from peal.rest import ApiException
from pprint import pprint

# Defining the host is optional and defaults to https://app.peal.social
# See configuration.py for a list of all supported configuration parameters.
configuration = peal.Configuration(
    host = "https://app.peal.social"
)

# The client must configure the authentication and authorization parameters
# in accordance with the API server security policy.
# Examples for each auth method are provided below, use the example that
# satisfies your auth use case.

# Configure Bearer authorization: bearer
configuration = peal.Configuration(
    access_token = os.environ["BEARER_TOKEN"]
)

# Enter a context with an instance of the API client
with peal.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = peal.NotificationPreferencesApi(api_client)
    notification_preferences_change = peal.NotificationPreferencesChange() # NotificationPreferencesChange | 

    try:
        # Change notification preferences
        api_response = api_instance.notification_preferences_update(notification_preferences_change)
        print("The response of NotificationPreferencesApi->notification_preferences_update:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling NotificationPreferencesApi->notification_preferences_update: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **notification_preferences_change** | [**NotificationPreferencesChange**](NotificationPreferencesChange.md)|  | 

### Return type

[**NotificationPreferences**](NotificationPreferences.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | NotificationPreferences |  -  |
**401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
**403** | The credentials are valid but do not allow this request. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

