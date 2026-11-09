# NoticesApi

All URIs are relative to *https://app.peal.social*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**noticesList**](NoticesApi.md#noticesList) | **GET** /api/me/notices | List notices |
| [**noticesMarkAllRead**](NoticesApi.md#noticesMarkAllRead) | **POST** /api/me/notices/read-all | Mark all notices read |
| [**noticesMarkRead**](NoticesApi.md#noticesMarkRead) | **POST** /api/me/notices/read | Mark notices read |
| [**noticesUnread**](NoticesApi.md#noticesUnread) | **GET** /api/me/notices/unread | Count unread notices |


<a id="noticesList"></a>
# **noticesList**
> NoticePage noticesList(cursor, limit)

List notices

Lists the user&#39;s notices, newest first, 20 a page unless &#x60;limit&#x60; (at most 100) says otherwise. Pass the page&#39;s &#x60;nextCursor&#x60; as &#x60;cursor&#x60; for the next one. Each notice is data, for the client to write in the reader&#39;s language.

### Example
```java
// Import classes:
import social.peal.ApiClient;
import social.peal.ApiException;
import social.peal.Configuration;
import social.peal.auth.*;
import social.peal.models.*;
import social.peal.api.NoticesApi;

public class Example {
  public static void main(String[] args) {
    ApiClient defaultClient = Configuration.getDefaultApiClient();
    defaultClient.setBasePath("https://app.peal.social");
    
    // Configure HTTP bearer authorization: bearer
    HttpBearerAuth bearer = (HttpBearerAuth) defaultClient.getAuthentication("bearer");
    bearer.setBearerToken("BEARER TOKEN");

    NoticesApi apiInstance = new NoticesApi(defaultClient);
    String cursor = "cursor_example"; // String | 
    String limit = "limit_example"; // String | 
    try {
      NoticePage result = apiInstance.noticesList(cursor, limit);
      System.out.println(result);
    } catch (ApiException e) {
      System.err.println("Exception when calling NoticesApi#noticesList");
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
| **cursor** | **String**|  | [optional] |
| **limit** | **String**|  | [optional] |

### Return type

[**NoticePage**](NoticePage.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | NoticePage |  -  |
| **400** | BadRequest |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |

<a id="noticesMarkAllRead"></a>
# **noticesMarkAllRead**
> UnreadNotices noticesMarkAllRead()

Mark all notices read

Marks every notice of the user read.

### Example
```java
// Import classes:
import social.peal.ApiClient;
import social.peal.ApiException;
import social.peal.Configuration;
import social.peal.auth.*;
import social.peal.models.*;
import social.peal.api.NoticesApi;

public class Example {
  public static void main(String[] args) {
    ApiClient defaultClient = Configuration.getDefaultApiClient();
    defaultClient.setBasePath("https://app.peal.social");
    
    // Configure HTTP bearer authorization: bearer
    HttpBearerAuth bearer = (HttpBearerAuth) defaultClient.getAuthentication("bearer");
    bearer.setBearerToken("BEARER TOKEN");

    NoticesApi apiInstance = new NoticesApi(defaultClient);
    try {
      UnreadNotices result = apiInstance.noticesMarkAllRead();
      System.out.println(result);
    } catch (ApiException e) {
      System.err.println("Exception when calling NoticesApi#noticesMarkAllRead");
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

[**UnreadNotices**](UnreadNotices.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | UnreadNotices |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |

<a id="noticesMarkRead"></a>
# **noticesMarkRead**
> UnreadNotices noticesMarkRead(markNoticesRead)

Mark notices read

Marks up to 100 of the user&#39;s notices read, and answers with how many stay unread. Ids that name none of the user&#39;s notices, and notices already read, are left as they are.

### Example
```java
// Import classes:
import social.peal.ApiClient;
import social.peal.ApiException;
import social.peal.Configuration;
import social.peal.auth.*;
import social.peal.models.*;
import social.peal.api.NoticesApi;

public class Example {
  public static void main(String[] args) {
    ApiClient defaultClient = Configuration.getDefaultApiClient();
    defaultClient.setBasePath("https://app.peal.social");
    
    // Configure HTTP bearer authorization: bearer
    HttpBearerAuth bearer = (HttpBearerAuth) defaultClient.getAuthentication("bearer");
    bearer.setBearerToken("BEARER TOKEN");

    NoticesApi apiInstance = new NoticesApi(defaultClient);
    MarkNoticesRead markNoticesRead = new MarkNoticesRead(); // MarkNoticesRead | 
    try {
      UnreadNotices result = apiInstance.noticesMarkRead(markNoticesRead);
      System.out.println(result);
    } catch (ApiException e) {
      System.err.println("Exception when calling NoticesApi#noticesMarkRead");
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
| **markNoticesRead** | [**MarkNoticesRead**](MarkNoticesRead.md)|  | |

### Return type

[**UnreadNotices**](UnreadNotices.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | UnreadNotices |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |

<a id="noticesUnread"></a>
# **noticesUnread**
> UnreadNotices noticesUnread()

Count unread notices

Counts the user&#39;s unread notices.

### Example
```java
// Import classes:
import social.peal.ApiClient;
import social.peal.ApiException;
import social.peal.Configuration;
import social.peal.auth.*;
import social.peal.models.*;
import social.peal.api.NoticesApi;

public class Example {
  public static void main(String[] args) {
    ApiClient defaultClient = Configuration.getDefaultApiClient();
    defaultClient.setBasePath("https://app.peal.social");
    
    // Configure HTTP bearer authorization: bearer
    HttpBearerAuth bearer = (HttpBearerAuth) defaultClient.getAuthentication("bearer");
    bearer.setBearerToken("BEARER TOKEN");

    NoticesApi apiInstance = new NoticesApi(defaultClient);
    try {
      UnreadNotices result = apiInstance.noticesUnread();
      System.out.println(result);
    } catch (ApiException e) {
      System.err.println("Exception when calling NoticesApi#noticesUnread");
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

[**UnreadNotices**](UnreadNotices.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | UnreadNotices |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |

