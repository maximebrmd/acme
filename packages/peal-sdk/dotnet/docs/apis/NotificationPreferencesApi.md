# Peal.Api.NotificationPreferencesApi

All URIs are relative to *https://app.peal.social*

| Method | HTTP request | Description |
|--------|--------------|-------------|
| [**NotificationPreferencesGet**](NotificationPreferencesApi.md#notificationpreferencesget) | **GET** /api/me/notification-preferences | Get notification preferences |
| [**NotificationPreferencesUpdate**](NotificationPreferencesApi.md#notificationpreferencesupdate) | **PATCH** /api/me/notification-preferences | Change notification preferences |

<a id="notificationpreferencesget"></a>
# **NotificationPreferencesGet**
> NotificationPreferences NotificationPreferencesGet ()

Get notification preferences

Answers with which notices the user receives by email, and whether they hear about every post. Until they change it: failed and unconfirmed posts, and channels to reconnect, but not published posts, are emailed; and they hear only about the posts they wrote.


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
| **200** | NotificationPreferences |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |

[[Back to top]](#) [[Back to API list]](../../README.md#documentation-for-api-endpoints) [[Back to Model list]](../../README.md#documentation-for-models) [[Back to README]](../../README.md)

<a id="notificationpreferencesupdate"></a>
# **NotificationPreferencesUpdate**
> NotificationPreferences NotificationPreferencesUpdate (NotificationPreferencesChange notificationPreferencesChange)

Change notification preferences

Changes the preferences given, keeps the others, and answers with them all. Staff impersonating the user may not change them.


### Parameters

| Name | Type | Description | Notes |
|------|------|-------------|-------|
| **notificationPreferencesChange** | [**NotificationPreferencesChange**](NotificationPreferencesChange.md) |  |  |

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
| **200** | NotificationPreferences |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |

[[Back to top]](#) [[Back to API list]](../../README.md#documentation-for-api-endpoints) [[Back to Model list]](../../README.md#documentation-for-models) [[Back to README]](../../README.md)

