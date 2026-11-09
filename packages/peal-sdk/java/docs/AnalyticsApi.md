# AnalyticsApi

All URIs are relative to *https://app.peal.social*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**analyticsPost**](AnalyticsApi.md#analyticsPost) | **GET** /api/workspaces/{workspaceId}/analytics/posts/{postId} | Get a post&#39;s analytics |
| [**analyticsSummary**](AnalyticsApi.md#analyticsSummary) | **GET** /api/workspaces/{workspaceId}/analytics/summary | Summarize the workspace&#39;s analytics |


<a id="analyticsPost"></a>
# **analyticsPost**
> PostAnalytics analyticsPost(workspaceId, postId)

Get a post&#39;s analytics

Answers with the counts of a post on each channel it went live on, over time. A post not published yet, or whose counts were not read yet, has no targets. Needs analytics:read.

### Example
```java
// Import classes:
import social.peal.ApiClient;
import social.peal.ApiException;
import social.peal.Configuration;
import social.peal.auth.*;
import social.peal.models.*;
import social.peal.api.AnalyticsApi;

public class Example {
  public static void main(String[] args) {
    ApiClient defaultClient = Configuration.getDefaultApiClient();
    defaultClient.setBasePath("https://app.peal.social");
    
    // Configure HTTP bearer authorization: bearer
    HttpBearerAuth bearer = (HttpBearerAuth) defaultClient.getAuthentication("bearer");
    bearer.setBearerToken("BEARER TOKEN");

    AnalyticsApi apiInstance = new AnalyticsApi(defaultClient);
    String workspaceId = "workspaceId_example"; // String | 
    String postId = "postId_example"; // String | 
    try {
      PostAnalytics result = apiInstance.analyticsPost(workspaceId, postId);
      System.out.println(result);
    } catch (ApiException e) {
      System.err.println("Exception when calling AnalyticsApi#analyticsPost");
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
| **workspaceId** | **String**|  | |
| **postId** | **String**|  | |

### Return type

[**PostAnalytics**](PostAnalytics.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | PostAnalytics |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |
| **404** | No workspace with this id is open to the caller. |  -  |

<a id="analyticsSummary"></a>
# **analyticsSummary**
> AnalyticsSummary analyticsSummary(workspaceId, from, timeZone, to)

Summarize the workspace&#39;s analytics

Sums up the posts published from &#x60;from&#x60; to &#x60;to&#x60;, both included and at most 366 days, as days run in &#x60;timeZone&#x60; (an IANA zone such as Europe/Paris): their latest counts in all and by channel, what they gained each day, and the five with the most engagement (likes, reposts, replies and quotes). Counts are read from the platforms every hour for 48 hours after a post goes live, then every day until it is 30 days old. Needs analytics:read.

### Example
```java
// Import classes:
import social.peal.ApiClient;
import social.peal.ApiException;
import social.peal.Configuration;
import social.peal.auth.*;
import social.peal.models.*;
import social.peal.api.AnalyticsApi;

public class Example {
  public static void main(String[] args) {
    ApiClient defaultClient = Configuration.getDefaultApiClient();
    defaultClient.setBasePath("https://app.peal.social");
    
    // Configure HTTP bearer authorization: bearer
    HttpBearerAuth bearer = (HttpBearerAuth) defaultClient.getAuthentication("bearer");
    bearer.setBearerToken("BEARER TOKEN");

    AnalyticsApi apiInstance = new AnalyticsApi(defaultClient);
    String workspaceId = "workspaceId_example"; // String | 
    String from = "from_example"; // String | 
    String timeZone = "timeZone_example"; // String | 
    String to = "to_example"; // String | 
    try {
      AnalyticsSummary result = apiInstance.analyticsSummary(workspaceId, from, timeZone, to);
      System.out.println(result);
    } catch (ApiException e) {
      System.err.println("Exception when calling AnalyticsApi#analyticsSummary");
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
| **workspaceId** | **String**|  | |
| **from** | **String**|  | |
| **timeZone** | **String**|  | |
| **to** | **String**|  | |

### Return type

[**AnalyticsSummary**](AnalyticsSummary.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | AnalyticsSummary |  -  |
| **400** | The range of days ends before it starts, or spans more than 366 days. |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |
| **404** | No workspace with this id is open to the caller. |  -  |
| **422** | The time zone is not an IANA time zone such as Europe/Paris. Offsets such as +01:00 are refused. |  -  |

