# NotificationPreferencesApi

All URIs are relative to *https://app.peal.social*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**notificationPreferencesGet**](NotificationPreferencesApi.md#notificationpreferencesget) | **GET** /api/me/notification-preferences | Get notification preferences |
| [**notificationPreferencesUpdate**](NotificationPreferencesApi.md#notificationpreferencesupdate) | **PATCH** /api/me/notification-preferences | Change notification preferences |



## notificationPreferencesGet

> NotificationPreferences notificationPreferencesGet()

Get notification preferences

Answers with which notices the user receives by email, and whether they hear about every post. Until they change it: failed and unconfirmed posts, and channels to reconnect, but not published posts, are emailed; and they hear only about the posts they wrote.

### Example

```ts
import {
  Configuration,
  NotificationPreferencesApi,
} from 'peal-sdk';
import type { NotificationPreferencesGetRequest } from 'peal-sdk';

async function example() {
  console.log("🚀 Testing peal-sdk SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new NotificationPreferencesApi(config);

  try {
    const data = await api.notificationPreferencesGet();
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters

This endpoint does not need any parameter.

### Return type

[**NotificationPreferences**](NotificationPreferences.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | NotificationPreferences |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## notificationPreferencesUpdate

> NotificationPreferences notificationPreferencesUpdate(notificationPreferencesChange)

Change notification preferences

Changes the preferences given, keeps the others, and answers with them all. Staff impersonating the user may not change them.

### Example

```ts
import {
  Configuration,
  NotificationPreferencesApi,
} from 'peal-sdk';
import type { NotificationPreferencesUpdateRequest } from 'peal-sdk';

async function example() {
  console.log("🚀 Testing peal-sdk SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new NotificationPreferencesApi(config);

  const body = {
    // NotificationPreferencesChange
    notificationPreferencesChange: ...,
  } satisfies NotificationPreferencesUpdateRequest;

  try {
    const data = await api.notificationPreferencesUpdate(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **notificationPreferencesChange** | [NotificationPreferencesChange](NotificationPreferencesChange.md) |  | |

### Return type

[**NotificationPreferences**](NotificationPreferences.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | NotificationPreferences |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

