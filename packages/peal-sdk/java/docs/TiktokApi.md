# TiktokApi

All URIs are relative to *https://app.peal.social*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**tiktokCreator**](TiktokApi.md#tiktokCreator) | **GET** /api/workspaces/{workspaceId}/channels/{channelId}/tiktok-creator | Read a TikTok channel&#39;s creator |
| [**tiktokCreatorWithHttpInfo**](TiktokApi.md#tiktokCreatorWithHttpInfo) | **GET** /api/workspaces/{workspaceId}/channels/{channelId}/tiktok-creator | Read a TikTok channel&#39;s creator |



## tiktokCreator

> TikTokAccount tiktokCreator(channelId, workspaceId)

Read a TikTok channel&#39;s creator

Reads a TikTok channel&#39;s creator from TikTok: their nickname, the audiences the account offers, the interactions they turned off and the longest video they may post, or why they cannot post now. A channel that is not TikTok&#39;s is ChannelNotFound. Needs post:create.

### Example

```java
// Import classes:
import social.peal.ApiClient;
import social.peal.ApiException;
import social.peal.Configuration;
import social.peal.auth.*;
import social.peal.models.*;
import social.peal.api.TiktokApi;

public class Example {
    public static void main(String[] args) {
        ApiClient defaultClient = Configuration.getDefaultApiClient();
        defaultClient.setBasePath("https://app.peal.social");
        
        // Configure HTTP bearer authorization: bearer
        HttpBearerAuth bearer = (HttpBearerAuth) defaultClient.getAuthentication("bearer");
        bearer.setBearerToken("BEARER TOKEN");

        TiktokApi apiInstance = new TiktokApi(defaultClient);
        String channelId = "channelId_example"; // String | 
        String workspaceId = "workspaceId_example"; // String | 
        try {
            TikTokAccount result = apiInstance.tiktokCreator(channelId, workspaceId);
            System.out.println(result);
        } catch (ApiException e) {
            System.err.println("Exception when calling TiktokApi#tiktokCreator");
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
| **channelId** | **String**|  | |
| **workspaceId** | **String**|  | |

### Return type

[**TikTokAccount**](TikTokAccount.md)


### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | TikTokAccount |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |
| **404** | The workspace has no channel with this id. | No workspace with this id is open to the caller. |  -  |
| **409** | The channel cannot post now: it is turned off (&#x60;disabled&#x60;), or its account must be reconnected (&#x60;reconnect&#x60;). |  -  |
| **502** | The platform did not answer, or failed on its side. Nothing was connected; try again later. |  -  |

## tiktokCreatorWithHttpInfo

> ApiResponse<TikTokAccount> tiktokCreatorWithHttpInfo(channelId, workspaceId)

Read a TikTok channel&#39;s creator

Reads a TikTok channel&#39;s creator from TikTok: their nickname, the audiences the account offers, the interactions they turned off and the longest video they may post, or why they cannot post now. A channel that is not TikTok&#39;s is ChannelNotFound. Needs post:create.

### Example

```java
// Import classes:
import social.peal.ApiClient;
import social.peal.ApiException;
import social.peal.ApiResponse;
import social.peal.Configuration;
import social.peal.auth.*;
import social.peal.models.*;
import social.peal.api.TiktokApi;

public class Example {
    public static void main(String[] args) {
        ApiClient defaultClient = Configuration.getDefaultApiClient();
        defaultClient.setBasePath("https://app.peal.social");
        
        // Configure HTTP bearer authorization: bearer
        HttpBearerAuth bearer = (HttpBearerAuth) defaultClient.getAuthentication("bearer");
        bearer.setBearerToken("BEARER TOKEN");

        TiktokApi apiInstance = new TiktokApi(defaultClient);
        String channelId = "channelId_example"; // String | 
        String workspaceId = "workspaceId_example"; // String | 
        try {
            ApiResponse<TikTokAccount> response = apiInstance.tiktokCreatorWithHttpInfo(channelId, workspaceId);
            System.out.println("Status code: " + response.getStatusCode());
            System.out.println("Response headers: " + response.getHeaders());
            System.out.println("Response body: " + response.getData());
        } catch (ApiException e) {
            System.err.println("Exception when calling TiktokApi#tiktokCreator");
            System.err.println("Status code: " + e.getCode());
            System.err.println("Response headers: " + e.getResponseHeaders());
            System.err.println("Reason: " + e.getResponseBody());
            e.printStackTrace();
        }
    }
}
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **channelId** | **String**|  | |
| **workspaceId** | **String**|  | |

### Return type

ApiResponse<[**TikTokAccount**](TikTokAccount.md)>


### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | TikTokAccount |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |
| **404** | The workspace has no channel with this id. | No workspace with this id is open to the caller. |  -  |
| **409** | The channel cannot post now: it is turned off (&#x60;disabled&#x60;), or its account must be reconnected (&#x60;reconnect&#x60;). |  -  |
| **502** | The platform did not answer, or failed on its side. Nothing was connected; try again later. |  -  |

