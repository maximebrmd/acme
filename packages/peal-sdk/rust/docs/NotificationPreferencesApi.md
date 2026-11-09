# \NotificationPreferencesApi

All URIs are relative to *https://app.peal.social*

Method | HTTP request | Description
------------- | ------------- | -------------
[**notification_preferences_get**](NotificationPreferencesApi.md#notification_preferences_get) | **GET** /api/me/notification-preferences | Get notification preferences
[**notification_preferences_update**](NotificationPreferencesApi.md#notification_preferences_update) | **PATCH** /api/me/notification-preferences | Change notification preferences



## notification_preferences_get

> models::NotificationPreferences notification_preferences_get()
Get notification preferences

Answers with which notices the user receives by email, and whether they hear about every post. Until they change it: failed and unconfirmed posts, and channels to reconnect, but not published posts, are emailed; and they hear only about the posts they wrote.

### Parameters

This endpoint does not need any parameter.

### Return type

[**models::NotificationPreferences**](NotificationPreferences.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)


## notification_preferences_update

> models::NotificationPreferences notification_preferences_update(notification_preferences_change)
Change notification preferences

Changes the preferences given, keeps the others, and answers with them all. Staff impersonating the user may not change them.

### Parameters


Name | Type | Description  | Required | Notes
------------- | ------------- | ------------- | ------------- | -------------
**notification_preferences_change** | [**NotificationPreferencesChange**](NotificationPreferencesChange.md) |  | [required] |

### Return type

[**models::NotificationPreferences**](NotificationPreferences.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

