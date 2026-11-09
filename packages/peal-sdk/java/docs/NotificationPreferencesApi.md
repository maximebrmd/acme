# NotificationPreferencesApi

All URIs are relative to *https://app.peal.social*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**notificationPreferencesGet**](NotificationPreferencesApi.md#notificationPreferencesGet) | **GET** /api/me/notification-preferences | Get notification preferences |
| [**notificationPreferencesUpdate**](NotificationPreferencesApi.md#notificationPreferencesUpdate) | **PATCH** /api/me/notification-preferences | Change notification preferences |


<a id="notificationPreferencesGet"></a>
# **notificationPreferencesGet**
> NotificationPreferences notificationPreferencesGet()

Get notification preferences

Answers with which notices the user receives by email, and whether they hear about every post. Until they change it: failed and unconfirmed posts, and channels to reconnect, but not published posts, are emailed; and they hear only about the posts they wrote.

### Example
```java
// Import classes:
import social.peal.ApiClient;
import social.peal.ApiException;
import social.peal.Configuration;
import social.peal.auth.*;
import social.peal.models.*;
import social.peal.api.NotificationPreferencesApi;

public class Example {
  public static void main(String[] args) {
    ApiClient defaultClient = Configuration.getDefaultApiClient();
    defaultClient.setBasePath("https://app.peal.social");
    
    // Configure HTTP bearer authorization: bearer
    HttpBearerAuth bearer = (HttpBearerAuth) defaultClient.getAuthentication("bearer");
    bearer.setBearerToken("BEARER TOKEN");

    NotificationPreferencesApi apiInstance = new NotificationPreferencesApi(defaultClient);
    try {
      NotificationPreferences result = apiInstance.notificationPreferencesGet();
      System.out.println(result);
    } catch (ApiException e) {
      System.err.println("Exception when calling NotificationPreferencesApi#notificationPreferencesGet");
      System.err.println("Status code: " + e.getCode());
      System.err.println("Reason: " + e.getResponseBody());
      System.err.println("Response headers: " + e.getResponseHeaders());
      e.printStackTrace();
    }
  }
}
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
| **200** | NotificationPreferences |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |

<a id="notificationPreferencesUpdate"></a>
# **notificationPreferencesUpdate**
> NotificationPreferences notificationPreferencesUpdate(notificationPreferencesChange)

Change notification preferences

Changes the preferences given, keeps the others, and answers with them all. Staff impersonating the user may not change them.

### Example
```java
// Import classes:
import social.peal.ApiClient;
import social.peal.ApiException;
import social.peal.Configuration;
import social.peal.auth.*;
import social.peal.models.*;
import social.peal.api.NotificationPreferencesApi;

public class Example {
  public static void main(String[] args) {
    ApiClient defaultClient = Configuration.getDefaultApiClient();
    defaultClient.setBasePath("https://app.peal.social");
    
    // Configure HTTP bearer authorization: bearer
    HttpBearerAuth bearer = (HttpBearerAuth) defaultClient.getAuthentication("bearer");
    bearer.setBearerToken("BEARER TOKEN");

    NotificationPreferencesApi apiInstance = new NotificationPreferencesApi(defaultClient);
    NotificationPreferencesChange notificationPreferencesChange = new NotificationPreferencesChange(); // NotificationPreferencesChange | 
    try {
      NotificationPreferences result = apiInstance.notificationPreferencesUpdate(notificationPreferencesChange);
      System.out.println(result);
    } catch (ApiException e) {
      System.err.println("Exception when calling NotificationPreferencesApi#notificationPreferencesUpdate");
      System.err.println("Status code: " + e.getCode());
      System.err.println("Reason: " + e.getResponseBody());
      System.err.println("Response headers: " + e.getResponseHeaders());
      e.printStackTrace();
    }
  }
}
```

### Parameters

| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **notificationPreferencesChange** | [**NotificationPreferencesChange**](NotificationPreferencesChange.md)|  | |

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

