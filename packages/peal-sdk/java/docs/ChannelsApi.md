# ChannelsApi

All URIs are relative to *https://app.peal.social*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**channelsChooseAccounts**](ChannelsApi.md#channelsChooseAccounts) | **POST** /api/workspaces/{workspaceId}/channels/connect/{platform}/accounts | Choose the accounts to connect |
| [**channelsCompleteConnect**](ChannelsApi.md#channelsCompleteConnect) | **POST** /api/workspaces/{workspaceId}/channels/connect/{platform}/callback | Complete connecting an account |
| [**channelsConnect**](ChannelsApi.md#channelsConnect) | **POST** /api/workspaces/{workspaceId}/channels/connect/{platform} | Start connecting an account |
| [**channelsDisconnect**](ChannelsApi.md#channelsDisconnect) | **DELETE** /api/workspaces/{workspaceId}/channels/{channelId} | Disconnect a channel |
| [**channelsList**](ChannelsApi.md#channelsList) | **GET** /api/workspaces/{workspaceId}/channels | List channels |
| [**channelsPlatforms**](ChannelsApi.md#channelsPlatforms) | **GET** /api/workspaces/{workspaceId}/channels/platforms | List connectable platforms |
| [**channelsReconnect**](ChannelsApi.md#channelsReconnect) | **POST** /api/workspaces/{workspaceId}/channels/{channelId}/reconnect | Start reconnecting a channel |


<a id="channelsChooseAccounts"></a>
# **channelsChooseAccounts**
> List&lt;Channel&gt; channelsChooseAccounts(workspaceId, platform, chooseAccounts)

Choose the accounts to connect

Connects the accounts the member chose among those a completed sign-in listed: each becomes a channel of the workspace, or reconnects the one it has. The new accounts chosen need room in the workspace&#39;s plan, all of them: otherwise none is connected (PlanLimitReached), and the choice can be made again with fewer. Only the member who completed the sign-in can choose, within 15 minutes, and once an account is connected: a choice that failed before connecting any can be made again. Needs channel:connect.

### Example
```java
// Import classes:
import social.peal.ApiClient;
import social.peal.ApiException;
import social.peal.Configuration;
import social.peal.auth.*;
import social.peal.models.*;
import social.peal.api.ChannelsApi;

public class Example {
  public static void main(String[] args) {
    ApiClient defaultClient = Configuration.getDefaultApiClient();
    defaultClient.setBasePath("https://app.peal.social");
    
    // Configure HTTP bearer authorization: bearer
    HttpBearerAuth bearer = (HttpBearerAuth) defaultClient.getAuthentication("bearer");
    bearer.setBearerToken("BEARER TOKEN");

    ChannelsApi apiInstance = new ChannelsApi(defaultClient);
    String workspaceId = "workspaceId_example"; // String | 
    Platform platform = Platform.fromValue("x"); // Platform | 
    ChooseAccounts chooseAccounts = new ChooseAccounts(); // ChooseAccounts | 
    try {
      List<Channel> result = apiInstance.channelsChooseAccounts(workspaceId, platform, chooseAccounts);
      System.out.println(result);
    } catch (ApiException e) {
      System.err.println("Exception when calling ChannelsApi#channelsChooseAccounts");
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
| **platform** | [**Platform**](.md)|  | [enum: x, linkedin, bluesky, mastodon, threads, instagram, facebook, tiktok, youtube, pinterest] |
| **chooseAccounts** | [**ChooseAccounts**](ChooseAccounts.md)|  | |

### Return type

[**List&lt;Channel&gt;**](Channel.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Success |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **402** | The workspace&#39;s plan allows no more of &#x60;limit&#x60;: it has &#x60;allowed&#x60; already. A larger plan, or removing some, makes room. Nothing was changed. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |
| **404** | The workspace has no channel with this id. | No workspace with this id is open to the caller. |  -  |
| **422** | The account was not connected; &#x60;reason&#x60; says why. Nothing was saved. |  -  |
| **502** | The platform did not answer, or failed on its side. Nothing was connected; try again later. |  -  |

<a id="channelsCompleteConnect"></a>
# **channelsCompleteConnect**
> ConnectOutcome channelsCompleteConnect(workspaceId, platform, connectCallback)

Complete connecting an account

Completes a connection with what the platform sent back: the account becomes a channel of the workspace, or the channel it reconnects takes its new tokens. When the sign-in reached several accounts, as the Pages a Facebook user manages, the answer lists them instead, to choose with chooseAccounts. Only the member who started the connection can complete it, once. A new account needs room in the workspace&#39;s plan (PlanLimitReached). Needs channel:connect.

### Example
```java
// Import classes:
import social.peal.ApiClient;
import social.peal.ApiException;
import social.peal.Configuration;
import social.peal.auth.*;
import social.peal.models.*;
import social.peal.api.ChannelsApi;

public class Example {
  public static void main(String[] args) {
    ApiClient defaultClient = Configuration.getDefaultApiClient();
    defaultClient.setBasePath("https://app.peal.social");
    
    // Configure HTTP bearer authorization: bearer
    HttpBearerAuth bearer = (HttpBearerAuth) defaultClient.getAuthentication("bearer");
    bearer.setBearerToken("BEARER TOKEN");

    ChannelsApi apiInstance = new ChannelsApi(defaultClient);
    String workspaceId = "workspaceId_example"; // String | 
    Platform platform = Platform.fromValue("x"); // Platform | 
    ConnectCallback connectCallback = new ConnectCallback(); // ConnectCallback | 
    try {
      ConnectOutcome result = apiInstance.channelsCompleteConnect(workspaceId, platform, connectCallback);
      System.out.println(result);
    } catch (ApiException e) {
      System.err.println("Exception when calling ChannelsApi#channelsCompleteConnect");
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
| **platform** | [**Platform**](.md)|  | [enum: x, linkedin, bluesky, mastodon, threads, instagram, facebook, tiktok, youtube, pinterest] |
| **connectCallback** | [**ConnectCallback**](ConnectCallback.md)|  | |

### Return type

[**ConnectOutcome**](ConnectOutcome.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | ConnectOutcome |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **402** | The workspace&#39;s plan allows no more of &#x60;limit&#x60;: it has &#x60;allowed&#x60; already. A larger plan, or removing some, makes room. Nothing was changed. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |
| **404** | The workspace has no channel with this id. | No workspace with this id is open to the caller. |  -  |
| **422** | The account was not connected; &#x60;reason&#x60; says why. Nothing was saved. |  -  |
| **502** | The platform did not answer, or failed on its side. Nothing was connected; try again later. |  -  |

<a id="channelsConnect"></a>
# **channelsConnect**
> Authorization channelsConnect(workspaceId, platform, connectChannel)

Start connecting an account

Starts connecting an account of the platform: answers with the platform&#39;s sign-in page, where the browser goes next. The connection is tied to the caller and the workspace, and must be completed within 15 minutes. On a server that bills, a workspace whose plan allows no more channels gets PlanLimitReached. Needs channel:connect.

### Example
```java
// Import classes:
import social.peal.ApiClient;
import social.peal.ApiException;
import social.peal.Configuration;
import social.peal.auth.*;
import social.peal.models.*;
import social.peal.api.ChannelsApi;

public class Example {
  public static void main(String[] args) {
    ApiClient defaultClient = Configuration.getDefaultApiClient();
    defaultClient.setBasePath("https://app.peal.social");
    
    // Configure HTTP bearer authorization: bearer
    HttpBearerAuth bearer = (HttpBearerAuth) defaultClient.getAuthentication("bearer");
    bearer.setBearerToken("BEARER TOKEN");

    ChannelsApi apiInstance = new ChannelsApi(defaultClient);
    String workspaceId = "workspaceId_example"; // String | 
    Platform platform = Platform.fromValue("x"); // Platform | 
    ConnectChannel connectChannel = new ConnectChannel(); // ConnectChannel | 
    try {
      Authorization result = apiInstance.channelsConnect(workspaceId, platform, connectChannel);
      System.out.println(result);
    } catch (ApiException e) {
      System.err.println("Exception when calling ChannelsApi#channelsConnect");
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
| **platform** | [**Platform**](.md)|  | [enum: x, linkedin, bluesky, mastodon, threads, instagram, facebook, tiktok, youtube, pinterest] |
| **connectChannel** | [**ConnectChannel**](ConnectChannel.md)|  | |

### Return type

[**Authorization**](Authorization.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Authorization |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **402** | The workspace&#39;s plan allows no more of &#x60;limit&#x60;: it has &#x60;allowed&#x60; already. A larger plan, or removing some, makes room. Nothing was changed. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |
| **404** | No workspace with this id is open to the caller. |  -  |
| **422** | The account was not connected; &#x60;reason&#x60; says why. Nothing was saved. |  -  |
| **502** | The platform did not answer, or failed on its side. Nothing was connected; try again later. |  -  |

<a id="channelsDisconnect"></a>
# **channelsDisconnect**
> channelsDisconnect(workspaceId, channelId)

Disconnect a channel

Disconnects a channel from the workspace: the channel and the tokens Peal holds for it are deleted, and nothing more is posted on it. Needs channel:disconnect.

### Example
```java
// Import classes:
import social.peal.ApiClient;
import social.peal.ApiException;
import social.peal.Configuration;
import social.peal.auth.*;
import social.peal.models.*;
import social.peal.api.ChannelsApi;

public class Example {
  public static void main(String[] args) {
    ApiClient defaultClient = Configuration.getDefaultApiClient();
    defaultClient.setBasePath("https://app.peal.social");
    
    // Configure HTTP bearer authorization: bearer
    HttpBearerAuth bearer = (HttpBearerAuth) defaultClient.getAuthentication("bearer");
    bearer.setBearerToken("BEARER TOKEN");

    ChannelsApi apiInstance = new ChannelsApi(defaultClient);
    String workspaceId = "workspaceId_example"; // String | 
    String channelId = "channelId_example"; // String | 
    try {
      apiInstance.channelsDisconnect(workspaceId, channelId);
    } catch (ApiException e) {
      System.err.println("Exception when calling ChannelsApi#channelsDisconnect");
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
| **channelId** | **String**|  | |

### Return type

null (empty response body)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **204** | &lt;No Content&gt; |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |
| **404** | The workspace has no channel with this id. | No workspace with this id is open to the caller. |  -  |

<a id="channelsList"></a>
# **channelsList**
> List&lt;Channel&gt; channelsList(workspaceId)

List channels

Lists the channels connected to the workspace, oldest first. Their tokens are never shown. Needs channel:read.

### Example
```java
// Import classes:
import social.peal.ApiClient;
import social.peal.ApiException;
import social.peal.Configuration;
import social.peal.auth.*;
import social.peal.models.*;
import social.peal.api.ChannelsApi;

public class Example {
  public static void main(String[] args) {
    ApiClient defaultClient = Configuration.getDefaultApiClient();
    defaultClient.setBasePath("https://app.peal.social");
    
    // Configure HTTP bearer authorization: bearer
    HttpBearerAuth bearer = (HttpBearerAuth) defaultClient.getAuthentication("bearer");
    bearer.setBearerToken("BEARER TOKEN");

    ChannelsApi apiInstance = new ChannelsApi(defaultClient);
    String workspaceId = "workspaceId_example"; // String | 
    try {
      List<Channel> result = apiInstance.channelsList(workspaceId);
      System.out.println(result);
    } catch (ApiException e) {
      System.err.println("Exception when calling ChannelsApi#channelsList");
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

### Return type

[**List&lt;Channel&gt;**](Channel.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Success |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |
| **404** | No workspace with this id is open to the caller. |  -  |

<a id="channelsPlatforms"></a>
# **channelsPlatforms**
> ConnectablePlatforms channelsPlatforms(workspaceId)

List connectable platforms

Lists the platforms this server can connect accounts of, in Peal&#39;s order. A platform that needs a setting the server lacks, such as an app registered on LinkedIn, X or Meta or a Google OAuth client, is left out. Needs channel:connect.

### Example
```java
// Import classes:
import social.peal.ApiClient;
import social.peal.ApiException;
import social.peal.Configuration;
import social.peal.auth.*;
import social.peal.models.*;
import social.peal.api.ChannelsApi;

public class Example {
  public static void main(String[] args) {
    ApiClient defaultClient = Configuration.getDefaultApiClient();
    defaultClient.setBasePath("https://app.peal.social");
    
    // Configure HTTP bearer authorization: bearer
    HttpBearerAuth bearer = (HttpBearerAuth) defaultClient.getAuthentication("bearer");
    bearer.setBearerToken("BEARER TOKEN");

    ChannelsApi apiInstance = new ChannelsApi(defaultClient);
    String workspaceId = "workspaceId_example"; // String | 
    try {
      ConnectablePlatforms result = apiInstance.channelsPlatforms(workspaceId);
      System.out.println(result);
    } catch (ApiException e) {
      System.err.println("Exception when calling ChannelsApi#channelsPlatforms");
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

### Return type

[**ConnectablePlatforms**](ConnectablePlatforms.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | ConnectablePlatforms |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |
| **404** | No workspace with this id is open to the caller. |  -  |

<a id="channelsReconnect"></a>
# **channelsReconnect**
> Authorization channelsReconnect(workspaceId, channelId)

Start reconnecting a channel

Starts reconnecting a channel whose token stopped working or is about to: answers with the platform&#39;s sign-in page. Completing it must sign in to the same account. A channel the workspace has takes no room in its plan, so no plan limit refuses it. Needs channel:connect.

### Example
```java
// Import classes:
import social.peal.ApiClient;
import social.peal.ApiException;
import social.peal.Configuration;
import social.peal.auth.*;
import social.peal.models.*;
import social.peal.api.ChannelsApi;

public class Example {
  public static void main(String[] args) {
    ApiClient defaultClient = Configuration.getDefaultApiClient();
    defaultClient.setBasePath("https://app.peal.social");
    
    // Configure HTTP bearer authorization: bearer
    HttpBearerAuth bearer = (HttpBearerAuth) defaultClient.getAuthentication("bearer");
    bearer.setBearerToken("BEARER TOKEN");

    ChannelsApi apiInstance = new ChannelsApi(defaultClient);
    String workspaceId = "workspaceId_example"; // String | 
    String channelId = "channelId_example"; // String | 
    try {
      Authorization result = apiInstance.channelsReconnect(workspaceId, channelId);
      System.out.println(result);
    } catch (ApiException e) {
      System.err.println("Exception when calling ChannelsApi#channelsReconnect");
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
| **channelId** | **String**|  | |

### Return type

[**Authorization**](Authorization.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Authorization |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |
| **404** | The workspace has no channel with this id. | No workspace with this id is open to the caller. |  -  |
| **422** | The account was not connected; &#x60;reason&#x60; says why. Nothing was saved. |  -  |
| **502** | The platform did not answer, or failed on its side. Nothing was connected; try again later. |  -  |

