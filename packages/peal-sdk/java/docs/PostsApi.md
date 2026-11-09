# PostsApi

All URIs are relative to *https://app.peal.social*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**postsAttempts**](PostsApi.md#postsAttempts) | **GET** /api/workspaces/{workspaceId}/posts/{postId}/attempts | List a post&#39;s attempts |
| [**postsAttemptsWithHttpInfo**](PostsApi.md#postsAttemptsWithHttpInfo) | **GET** /api/workspaces/{workspaceId}/posts/{postId}/attempts | List a post&#39;s attempts |
| [**postsCancel**](PostsApi.md#postsCancel) | **POST** /api/workspaces/{workspaceId}/posts/{postId}/cancel | Cancel a post |
| [**postsCancelWithHttpInfo**](PostsApi.md#postsCancelWithHttpInfo) | **POST** /api/workspaces/{workspaceId}/posts/{postId}/cancel | Cancel a post |
| [**postsConfirm**](PostsApi.md#postsConfirm) | **POST** /api/workspaces/{workspaceId}/posts/{postId}/targets/{targetId}/confirm | Confirm a post on a channel |
| [**postsConfirmWithHttpInfo**](PostsApi.md#postsConfirmWithHttpInfo) | **POST** /api/workspaces/{workspaceId}/posts/{postId}/targets/{targetId}/confirm | Confirm a post on a channel |
| [**postsCreate**](PostsApi.md#postsCreate) | **POST** /api/workspaces/{workspaceId}/posts | Create a draft |
| [**postsCreateWithHttpInfo**](PostsApi.md#postsCreateWithHttpInfo) | **POST** /api/workspaces/{workspaceId}/posts | Create a draft |
| [**postsDiscard**](PostsApi.md#postsDiscard) | **DELETE** /api/workspaces/{workspaceId}/posts/{postId} | Discard a draft |
| [**postsDiscardWithHttpInfo**](PostsApi.md#postsDiscardWithHttpInfo) | **DELETE** /api/workspaces/{workspaceId}/posts/{postId} | Discard a draft |
| [**postsDrafts**](PostsApi.md#postsDrafts) | **GET** /api/workspaces/{workspaceId}/posts/drafts | List drafts |
| [**postsDraftsWithHttpInfo**](PostsApi.md#postsDraftsWithHttpInfo) | **GET** /api/workspaces/{workspaceId}/posts/drafts | List drafts |
| [**postsGet**](PostsApi.md#postsGet) | **GET** /api/workspaces/{workspaceId}/posts/{postId} | Get a post |
| [**postsGetWithHttpInfo**](PostsApi.md#postsGetWithHttpInfo) | **GET** /api/workspaces/{workspaceId}/posts/{postId} | Get a post |
| [**postsList**](PostsApi.md#postsList) | **GET** /api/workspaces/{workspaceId}/posts | List scheduled posts |
| [**postsListWithHttpInfo**](PostsApi.md#postsListWithHttpInfo) | **GET** /api/workspaces/{workspaceId}/posts | List scheduled posts |
| [**postsRepost**](PostsApi.md#postsRepost) | **POST** /api/workspaces/{workspaceId}/posts/{postId}/targets/{targetId}/repost | Repost on a channel |
| [**postsRepostWithHttpInfo**](PostsApi.md#postsRepostWithHttpInfo) | **POST** /api/workspaces/{workspaceId}/posts/{postId}/targets/{targetId}/repost | Repost on a channel |
| [**postsReschedule**](PostsApi.md#postsReschedule) | **POST** /api/workspaces/{workspaceId}/posts/{postId}/reschedule | Reschedule a post |
| [**postsRescheduleWithHttpInfo**](PostsApi.md#postsRescheduleWithHttpInfo) | **POST** /api/workspaces/{workspaceId}/posts/{postId}/reschedule | Reschedule a post |
| [**postsSchedule**](PostsApi.md#postsSchedule) | **POST** /api/workspaces/{workspaceId}/posts/{postId}/schedule | Schedule a draft |
| [**postsScheduleWithHttpInfo**](PostsApi.md#postsScheduleWithHttpInfo) | **POST** /api/workspaces/{workspaceId}/posts/{postId}/schedule | Schedule a draft |
| [**postsUnschedule**](PostsApi.md#postsUnschedule) | **POST** /api/workspaces/{workspaceId}/posts/{postId}/unschedule | Unschedule a post |
| [**postsUnscheduleWithHttpInfo**](PostsApi.md#postsUnscheduleWithHttpInfo) | **POST** /api/workspaces/{workspaceId}/posts/{postId}/unschedule | Unschedule a post |
| [**postsUpdate**](PostsApi.md#postsUpdate) | **PUT** /api/workspaces/{workspaceId}/posts/{postId} | Update a draft |
| [**postsUpdateWithHttpInfo**](PostsApi.md#postsUpdateWithHttpInfo) | **PUT** /api/workspaces/{workspaceId}/posts/{postId} | Update a draft |



## postsAttempts

> List<PublicationAttempt> postsAttempts(workspaceId, postId)

List a post&#39;s attempts

Lists every attempt Peal made at publishing the post, by channel, round and attempt, with how each ended. An attempt still in progress is not listed yet. Needs post:read.

### Example

```java
// Import classes:
import social.peal.ApiClient;
import social.peal.ApiException;
import social.peal.Configuration;
import social.peal.auth.*;
import social.peal.models.*;
import social.peal.api.PostsApi;

public class Example {
    public static void main(String[] args) {
        ApiClient defaultClient = Configuration.getDefaultApiClient();
        defaultClient.setBasePath("https://app.peal.social");
        
        // Configure HTTP bearer authorization: bearer
        HttpBearerAuth bearer = (HttpBearerAuth) defaultClient.getAuthentication("bearer");
        bearer.setBearerToken("BEARER TOKEN");

        PostsApi apiInstance = new PostsApi(defaultClient);
        String workspaceId = "workspaceId_example"; // String | 
        String postId = "postId_example"; // String | 
        try {
            List<PublicationAttempt> result = apiInstance.postsAttempts(workspaceId, postId);
            System.out.println(result);
        } catch (ApiException e) {
            System.err.println("Exception when calling PostsApi#postsAttempts");
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

[**List&lt;PublicationAttempt&gt;**](PublicationAttempt.md)


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
| **404** | The workspace has no post with this id. | No workspace with this id is open to the caller. |  -  |

## postsAttemptsWithHttpInfo

> ApiResponse<List<PublicationAttempt>> postsAttemptsWithHttpInfo(workspaceId, postId)

List a post&#39;s attempts

Lists every attempt Peal made at publishing the post, by channel, round and attempt, with how each ended. An attempt still in progress is not listed yet. Needs post:read.

### Example

```java
// Import classes:
import social.peal.ApiClient;
import social.peal.ApiException;
import social.peal.ApiResponse;
import social.peal.Configuration;
import social.peal.auth.*;
import social.peal.models.*;
import social.peal.api.PostsApi;

public class Example {
    public static void main(String[] args) {
        ApiClient defaultClient = Configuration.getDefaultApiClient();
        defaultClient.setBasePath("https://app.peal.social");
        
        // Configure HTTP bearer authorization: bearer
        HttpBearerAuth bearer = (HttpBearerAuth) defaultClient.getAuthentication("bearer");
        bearer.setBearerToken("BEARER TOKEN");

        PostsApi apiInstance = new PostsApi(defaultClient);
        String workspaceId = "workspaceId_example"; // String | 
        String postId = "postId_example"; // String | 
        try {
            ApiResponse<List<PublicationAttempt>> response = apiInstance.postsAttemptsWithHttpInfo(workspaceId, postId);
            System.out.println("Status code: " + response.getStatusCode());
            System.out.println("Response headers: " + response.getHeaders());
            System.out.println("Response body: " + response.getData());
        } catch (ApiException e) {
            System.err.println("Exception when calling PostsApi#postsAttempts");
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
| **workspaceId** | **String**|  | |
| **postId** | **String**|  | |

### Return type

ApiResponse<[**List&lt;PublicationAttempt&gt;**](PublicationAttempt.md)>


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
| **404** | The workspace has no post with this id. | No workspace with this id is open to the caller. |  -  |


## postsCancel

> Post postsCancel(workspaceId, postId)

Cancel a post

Cancels a draft or a scheduled post. A post already publishing finishes with what its channels did: those not yet sent are cancelled. Needs post:schedule.

### Example

```java
// Import classes:
import social.peal.ApiClient;
import social.peal.ApiException;
import social.peal.Configuration;
import social.peal.auth.*;
import social.peal.models.*;
import social.peal.api.PostsApi;

public class Example {
    public static void main(String[] args) {
        ApiClient defaultClient = Configuration.getDefaultApiClient();
        defaultClient.setBasePath("https://app.peal.social");
        
        // Configure HTTP bearer authorization: bearer
        HttpBearerAuth bearer = (HttpBearerAuth) defaultClient.getAuthentication("bearer");
        bearer.setBearerToken("BEARER TOKEN");

        PostsApi apiInstance = new PostsApi(defaultClient);
        String workspaceId = "workspaceId_example"; // String | 
        String postId = "postId_example"; // String | 
        try {
            Post result = apiInstance.postsCancel(workspaceId, postId);
            System.out.println(result);
        } catch (ApiException e) {
            System.err.println("Exception when calling PostsApi#postsCancel");
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

[**Post**](Post.md)


### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Post |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |
| **404** | The workspace has no post with this id. | No workspace with this id is open to the caller. |  -  |
| **409** | The post&#39;s status does not allow this. &#x60;status&#x60; is the status it has. |  -  |

## postsCancelWithHttpInfo

> ApiResponse<Post> postsCancelWithHttpInfo(workspaceId, postId)

Cancel a post

Cancels a draft or a scheduled post. A post already publishing finishes with what its channels did: those not yet sent are cancelled. Needs post:schedule.

### Example

```java
// Import classes:
import social.peal.ApiClient;
import social.peal.ApiException;
import social.peal.ApiResponse;
import social.peal.Configuration;
import social.peal.auth.*;
import social.peal.models.*;
import social.peal.api.PostsApi;

public class Example {
    public static void main(String[] args) {
        ApiClient defaultClient = Configuration.getDefaultApiClient();
        defaultClient.setBasePath("https://app.peal.social");
        
        // Configure HTTP bearer authorization: bearer
        HttpBearerAuth bearer = (HttpBearerAuth) defaultClient.getAuthentication("bearer");
        bearer.setBearerToken("BEARER TOKEN");

        PostsApi apiInstance = new PostsApi(defaultClient);
        String workspaceId = "workspaceId_example"; // String | 
        String postId = "postId_example"; // String | 
        try {
            ApiResponse<Post> response = apiInstance.postsCancelWithHttpInfo(workspaceId, postId);
            System.out.println("Status code: " + response.getStatusCode());
            System.out.println("Response headers: " + response.getHeaders());
            System.out.println("Response body: " + response.getData());
        } catch (ApiException e) {
            System.err.println("Exception when calling PostsApi#postsCancel");
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
| **workspaceId** | **String**|  | |
| **postId** | **String**|  | |

### Return type

ApiResponse<[**Post**](Post.md)>


### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Post |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |
| **404** | The workspace has no post with this id. | No workspace with this id is open to the caller. |  -  |
| **409** | The post&#39;s status does not allow this. &#x60;status&#x60; is the status it has. |  -  |


## postsConfirm

> Post postsConfirm(workspaceId, postId, targetId, targetConfirmation)

Confirm a post on a channel

Says what you found on the platform for a post unconfirmed on one channel: &#x60;published&#x60;, with its address if you have it, or &#x60;notPublished&#x60;, which fails it there so it can be reposted. Its notifications are marked read. Needs post:schedule.

### Example

```java
// Import classes:
import social.peal.ApiClient;
import social.peal.ApiException;
import social.peal.Configuration;
import social.peal.auth.*;
import social.peal.models.*;
import social.peal.api.PostsApi;

public class Example {
    public static void main(String[] args) {
        ApiClient defaultClient = Configuration.getDefaultApiClient();
        defaultClient.setBasePath("https://app.peal.social");
        
        // Configure HTTP bearer authorization: bearer
        HttpBearerAuth bearer = (HttpBearerAuth) defaultClient.getAuthentication("bearer");
        bearer.setBearerToken("BEARER TOKEN");

        PostsApi apiInstance = new PostsApi(defaultClient);
        String workspaceId = "workspaceId_example"; // String | 
        String postId = "postId_example"; // String | 
        String targetId = "targetId_example"; // String | 
        TargetConfirmation targetConfirmation = new TargetConfirmation(); // TargetConfirmation | 
        try {
            Post result = apiInstance.postsConfirm(workspaceId, postId, targetId, targetConfirmation);
            System.out.println(result);
        } catch (ApiException e) {
            System.err.println("Exception when calling PostsApi#postsConfirm");
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
| **targetId** | **String**|  | |
| **targetConfirmation** | [**TargetConfirmation**](TargetConfirmation.md)|  | |

### Return type

[**Post**](Post.md)


### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Post |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |
| **404** | The workspace has no post with this id. | No workspace with this id is open to the caller. |  -  |
| **409** | The post&#39;s status does not allow this. &#x60;status&#x60; is the status it has. | The post&#39;s status on that channel does not allow this. &#x60;status&#x60; is the status it has. |  -  |

## postsConfirmWithHttpInfo

> ApiResponse<Post> postsConfirmWithHttpInfo(workspaceId, postId, targetId, targetConfirmation)

Confirm a post on a channel

Says what you found on the platform for a post unconfirmed on one channel: &#x60;published&#x60;, with its address if you have it, or &#x60;notPublished&#x60;, which fails it there so it can be reposted. Its notifications are marked read. Needs post:schedule.

### Example

```java
// Import classes:
import social.peal.ApiClient;
import social.peal.ApiException;
import social.peal.ApiResponse;
import social.peal.Configuration;
import social.peal.auth.*;
import social.peal.models.*;
import social.peal.api.PostsApi;

public class Example {
    public static void main(String[] args) {
        ApiClient defaultClient = Configuration.getDefaultApiClient();
        defaultClient.setBasePath("https://app.peal.social");
        
        // Configure HTTP bearer authorization: bearer
        HttpBearerAuth bearer = (HttpBearerAuth) defaultClient.getAuthentication("bearer");
        bearer.setBearerToken("BEARER TOKEN");

        PostsApi apiInstance = new PostsApi(defaultClient);
        String workspaceId = "workspaceId_example"; // String | 
        String postId = "postId_example"; // String | 
        String targetId = "targetId_example"; // String | 
        TargetConfirmation targetConfirmation = new TargetConfirmation(); // TargetConfirmation | 
        try {
            ApiResponse<Post> response = apiInstance.postsConfirmWithHttpInfo(workspaceId, postId, targetId, targetConfirmation);
            System.out.println("Status code: " + response.getStatusCode());
            System.out.println("Response headers: " + response.getHeaders());
            System.out.println("Response body: " + response.getData());
        } catch (ApiException e) {
            System.err.println("Exception when calling PostsApi#postsConfirm");
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
| **workspaceId** | **String**|  | |
| **postId** | **String**|  | |
| **targetId** | **String**|  | |
| **targetConfirmation** | [**TargetConfirmation**](TargetConfirmation.md)|  | |

### Return type

ApiResponse<[**Post**](Post.md)>


### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Post |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |
| **404** | The workspace has no post with this id. | No workspace with this id is open to the caller. |  -  |
| **409** | The post&#39;s status does not allow this. &#x60;status&#x60; is the status it has. | The post&#39;s status on that channel does not allow this. &#x60;status&#x60; is the status it has. |  -  |


## postsCreate

> Post postsCreate(workspaceId, postDraft)

Create a draft

Creates a draft for some of the workspace&#39;s channels, possibly none yet, with options on those whose platform takes them (&#x60;TargetOptions&#x60;, of the channel&#39;s platform). Its media must be the workspace&#39;s, and ready. Its text, media and options are checked against each platform&#39;s rules when it is scheduled, not before. Needs post:create, channel:read, and media:read when it shows media.

### Example

```java
// Import classes:
import social.peal.ApiClient;
import social.peal.ApiException;
import social.peal.Configuration;
import social.peal.auth.*;
import social.peal.models.*;
import social.peal.api.PostsApi;

public class Example {
    public static void main(String[] args) {
        ApiClient defaultClient = Configuration.getDefaultApiClient();
        defaultClient.setBasePath("https://app.peal.social");
        
        // Configure HTTP bearer authorization: bearer
        HttpBearerAuth bearer = (HttpBearerAuth) defaultClient.getAuthentication("bearer");
        bearer.setBearerToken("BEARER TOKEN");

        PostsApi apiInstance = new PostsApi(defaultClient);
        String workspaceId = "workspaceId_example"; // String | 
        PostDraft postDraft = new PostDraft(); // PostDraft | 
        try {
            Post result = apiInstance.postsCreate(workspaceId, postDraft);
            System.out.println(result);
        } catch (ApiException e) {
            System.err.println("Exception when calling PostsApi#postsCreate");
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
| **postDraft** | [**PostDraft**](PostDraft.md)|  | |

### Return type

[**Post**](Post.md)


### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **201** | Post |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |
| **404** | No workspace with this id is open to the caller. |  -  |
| **422** | The post&#39;s content breaks the rules of its channels&#39; platforms: &#x60;violations&#x60; says how, channel by channel, for its images and videos, media by media, and for its options on a channel, option by option (&#x60;field&#x60;). | Some channels asked for are not connected to the workspace: &#x60;channelIds&#x60; lists them. | Some media attached are not the workspace&#39;s, or not ready to show: &#x60;mediaIds&#x60; lists them. |  -  |

## postsCreateWithHttpInfo

> ApiResponse<Post> postsCreateWithHttpInfo(workspaceId, postDraft)

Create a draft

Creates a draft for some of the workspace&#39;s channels, possibly none yet, with options on those whose platform takes them (&#x60;TargetOptions&#x60;, of the channel&#39;s platform). Its media must be the workspace&#39;s, and ready. Its text, media and options are checked against each platform&#39;s rules when it is scheduled, not before. Needs post:create, channel:read, and media:read when it shows media.

### Example

```java
// Import classes:
import social.peal.ApiClient;
import social.peal.ApiException;
import social.peal.ApiResponse;
import social.peal.Configuration;
import social.peal.auth.*;
import social.peal.models.*;
import social.peal.api.PostsApi;

public class Example {
    public static void main(String[] args) {
        ApiClient defaultClient = Configuration.getDefaultApiClient();
        defaultClient.setBasePath("https://app.peal.social");
        
        // Configure HTTP bearer authorization: bearer
        HttpBearerAuth bearer = (HttpBearerAuth) defaultClient.getAuthentication("bearer");
        bearer.setBearerToken("BEARER TOKEN");

        PostsApi apiInstance = new PostsApi(defaultClient);
        String workspaceId = "workspaceId_example"; // String | 
        PostDraft postDraft = new PostDraft(); // PostDraft | 
        try {
            ApiResponse<Post> response = apiInstance.postsCreateWithHttpInfo(workspaceId, postDraft);
            System.out.println("Status code: " + response.getStatusCode());
            System.out.println("Response headers: " + response.getHeaders());
            System.out.println("Response body: " + response.getData());
        } catch (ApiException e) {
            System.err.println("Exception when calling PostsApi#postsCreate");
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
| **workspaceId** | **String**|  | |
| **postDraft** | [**PostDraft**](PostDraft.md)|  | |

### Return type

ApiResponse<[**Post**](Post.md)>


### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **201** | Post |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |
| **404** | No workspace with this id is open to the caller. |  -  |
| **422** | The post&#39;s content breaks the rules of its channels&#39; platforms: &#x60;violations&#x60; says how, channel by channel, for its images and videos, media by media, and for its options on a channel, option by option (&#x60;field&#x60;). | Some channels asked for are not connected to the workspace: &#x60;channelIds&#x60; lists them. | Some media attached are not the workspace&#39;s, or not ready to show: &#x60;mediaIds&#x60; lists them. |  -  |


## postsDiscard

> void postsDiscard(workspaceId, postId)

Discard a draft

Deletes a draft. A post scheduled or sent is a conflict: cancel it instead. Needs post:delete, or post:update for the user who created the draft.

### Example

```java
// Import classes:
import social.peal.ApiClient;
import social.peal.ApiException;
import social.peal.Configuration;
import social.peal.auth.*;
import social.peal.models.*;
import social.peal.api.PostsApi;

public class Example {
    public static void main(String[] args) {
        ApiClient defaultClient = Configuration.getDefaultApiClient();
        defaultClient.setBasePath("https://app.peal.social");
        
        // Configure HTTP bearer authorization: bearer
        HttpBearerAuth bearer = (HttpBearerAuth) defaultClient.getAuthentication("bearer");
        bearer.setBearerToken("BEARER TOKEN");

        PostsApi apiInstance = new PostsApi(defaultClient);
        String workspaceId = "workspaceId_example"; // String | 
        String postId = "postId_example"; // String | 
        try {
            apiInstance.postsDiscard(workspaceId, postId);
        } catch (ApiException e) {
            System.err.println("Exception when calling PostsApi#postsDiscard");
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
| **404** | The workspace has no post with this id. | No workspace with this id is open to the caller. |  -  |
| **409** | The post&#39;s status does not allow this. &#x60;status&#x60; is the status it has. |  -  |

## postsDiscardWithHttpInfo

> ApiResponse<Void> postsDiscardWithHttpInfo(workspaceId, postId)

Discard a draft

Deletes a draft. A post scheduled or sent is a conflict: cancel it instead. Needs post:delete, or post:update for the user who created the draft.

### Example

```java
// Import classes:
import social.peal.ApiClient;
import social.peal.ApiException;
import social.peal.ApiResponse;
import social.peal.Configuration;
import social.peal.auth.*;
import social.peal.models.*;
import social.peal.api.PostsApi;

public class Example {
    public static void main(String[] args) {
        ApiClient defaultClient = Configuration.getDefaultApiClient();
        defaultClient.setBasePath("https://app.peal.social");
        
        // Configure HTTP bearer authorization: bearer
        HttpBearerAuth bearer = (HttpBearerAuth) defaultClient.getAuthentication("bearer");
        bearer.setBearerToken("BEARER TOKEN");

        PostsApi apiInstance = new PostsApi(defaultClient);
        String workspaceId = "workspaceId_example"; // String | 
        String postId = "postId_example"; // String | 
        try {
            ApiResponse<Void> response = apiInstance.postsDiscardWithHttpInfo(workspaceId, postId);
            System.out.println("Status code: " + response.getStatusCode());
            System.out.println("Response headers: " + response.getHeaders());
        } catch (ApiException e) {
            System.err.println("Exception when calling PostsApi#postsDiscard");
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
| **workspaceId** | **String**|  | |
| **postId** | **String**|  | |

### Return type


ApiResponse<Void>

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
| **404** | The workspace has no post with this id. | No workspace with this id is open to the caller. |  -  |
| **409** | The post&#39;s status does not allow this. &#x60;status&#x60; is the status it has. |  -  |


## postsDrafts

> DraftPage postsDrafts(workspaceId, cursor, limit)

List drafts

Lists the workspace&#39;s drafts, newest first, 20 a page unless &#x60;limit&#x60; (at most 50) says otherwise. Pass the page&#39;s &#x60;nextCursor&#x60; as &#x60;cursor&#x60; for the next one. Needs post:read.

### Example

```java
// Import classes:
import social.peal.ApiClient;
import social.peal.ApiException;
import social.peal.Configuration;
import social.peal.auth.*;
import social.peal.models.*;
import social.peal.api.PostsApi;

public class Example {
    public static void main(String[] args) {
        ApiClient defaultClient = Configuration.getDefaultApiClient();
        defaultClient.setBasePath("https://app.peal.social");
        
        // Configure HTTP bearer authorization: bearer
        HttpBearerAuth bearer = (HttpBearerAuth) defaultClient.getAuthentication("bearer");
        bearer.setBearerToken("BEARER TOKEN");

        PostsApi apiInstance = new PostsApi(defaultClient);
        String workspaceId = "workspaceId_example"; // String | 
        String cursor = "cursor_example"; // String | 
        String limit = "limit_example"; // String | 
        try {
            DraftPage result = apiInstance.postsDrafts(workspaceId, cursor, limit);
            System.out.println(result);
        } catch (ApiException e) {
            System.err.println("Exception when calling PostsApi#postsDrafts");
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
| **cursor** | **String**|  | [optional] |
| **limit** | **String**|  | [optional] |

### Return type

[**DraftPage**](DraftPage.md)


### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | DraftPage |  -  |
| **400** | BadRequest |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |
| **404** | No workspace with this id is open to the caller. |  -  |

## postsDraftsWithHttpInfo

> ApiResponse<DraftPage> postsDraftsWithHttpInfo(workspaceId, cursor, limit)

List drafts

Lists the workspace&#39;s drafts, newest first, 20 a page unless &#x60;limit&#x60; (at most 50) says otherwise. Pass the page&#39;s &#x60;nextCursor&#x60; as &#x60;cursor&#x60; for the next one. Needs post:read.

### Example

```java
// Import classes:
import social.peal.ApiClient;
import social.peal.ApiException;
import social.peal.ApiResponse;
import social.peal.Configuration;
import social.peal.auth.*;
import social.peal.models.*;
import social.peal.api.PostsApi;

public class Example {
    public static void main(String[] args) {
        ApiClient defaultClient = Configuration.getDefaultApiClient();
        defaultClient.setBasePath("https://app.peal.social");
        
        // Configure HTTP bearer authorization: bearer
        HttpBearerAuth bearer = (HttpBearerAuth) defaultClient.getAuthentication("bearer");
        bearer.setBearerToken("BEARER TOKEN");

        PostsApi apiInstance = new PostsApi(defaultClient);
        String workspaceId = "workspaceId_example"; // String | 
        String cursor = "cursor_example"; // String | 
        String limit = "limit_example"; // String | 
        try {
            ApiResponse<DraftPage> response = apiInstance.postsDraftsWithHttpInfo(workspaceId, cursor, limit);
            System.out.println("Status code: " + response.getStatusCode());
            System.out.println("Response headers: " + response.getHeaders());
            System.out.println("Response body: " + response.getData());
        } catch (ApiException e) {
            System.err.println("Exception when calling PostsApi#postsDrafts");
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
| **workspaceId** | **String**|  | |
| **cursor** | **String**|  | [optional] |
| **limit** | **String**|  | [optional] |

### Return type

ApiResponse<[**DraftPage**](DraftPage.md)>


### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | DraftPage |  -  |
| **400** | BadRequest |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |
| **404** | No workspace with this id is open to the caller. |  -  |


## postsGet

> Post postsGet(workspaceId, postId)

Get a post

Answers with a post of the workspace. Needs post:read.

### Example

```java
// Import classes:
import social.peal.ApiClient;
import social.peal.ApiException;
import social.peal.Configuration;
import social.peal.auth.*;
import social.peal.models.*;
import social.peal.api.PostsApi;

public class Example {
    public static void main(String[] args) {
        ApiClient defaultClient = Configuration.getDefaultApiClient();
        defaultClient.setBasePath("https://app.peal.social");
        
        // Configure HTTP bearer authorization: bearer
        HttpBearerAuth bearer = (HttpBearerAuth) defaultClient.getAuthentication("bearer");
        bearer.setBearerToken("BEARER TOKEN");

        PostsApi apiInstance = new PostsApi(defaultClient);
        String workspaceId = "workspaceId_example"; // String | 
        String postId = "postId_example"; // String | 
        try {
            Post result = apiInstance.postsGet(workspaceId, postId);
            System.out.println(result);
        } catch (ApiException e) {
            System.err.println("Exception when calling PostsApi#postsGet");
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

[**Post**](Post.md)


### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Post |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |
| **404** | The workspace has no post with this id. | No workspace with this id is open to the caller. |  -  |

## postsGetWithHttpInfo

> ApiResponse<Post> postsGetWithHttpInfo(workspaceId, postId)

Get a post

Answers with a post of the workspace. Needs post:read.

### Example

```java
// Import classes:
import social.peal.ApiClient;
import social.peal.ApiException;
import social.peal.ApiResponse;
import social.peal.Configuration;
import social.peal.auth.*;
import social.peal.models.*;
import social.peal.api.PostsApi;

public class Example {
    public static void main(String[] args) {
        ApiClient defaultClient = Configuration.getDefaultApiClient();
        defaultClient.setBasePath("https://app.peal.social");
        
        // Configure HTTP bearer authorization: bearer
        HttpBearerAuth bearer = (HttpBearerAuth) defaultClient.getAuthentication("bearer");
        bearer.setBearerToken("BEARER TOKEN");

        PostsApi apiInstance = new PostsApi(defaultClient);
        String workspaceId = "workspaceId_example"; // String | 
        String postId = "postId_example"; // String | 
        try {
            ApiResponse<Post> response = apiInstance.postsGetWithHttpInfo(workspaceId, postId);
            System.out.println("Status code: " + response.getStatusCode());
            System.out.println("Response headers: " + response.getHeaders());
            System.out.println("Response body: " + response.getData());
        } catch (ApiException e) {
            System.err.println("Exception when calling PostsApi#postsGet");
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
| **workspaceId** | **String**|  | |
| **postId** | **String**|  | |

### Return type

ApiResponse<[**Post**](Post.md)>


### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Post |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |
| **404** | The workspace has no post with this id. | No workspace with this id is open to the caller. |  -  |


## postsList

> List<Post> postsList(workspaceId, from, to)

List scheduled posts

Lists the posts scheduled from &#x60;from&#x60; (included) to &#x60;to&#x60; (excluded), at most 62 days apart, by scheduled instant, with their channels and how each went. Drafts have no time and are not listed; cancelled posts are, with the time they had. Needs post:read.

### Example

```java
// Import classes:
import social.peal.ApiClient;
import social.peal.ApiException;
import social.peal.Configuration;
import social.peal.auth.*;
import social.peal.models.*;
import social.peal.api.PostsApi;

public class Example {
    public static void main(String[] args) {
        ApiClient defaultClient = Configuration.getDefaultApiClient();
        defaultClient.setBasePath("https://app.peal.social");
        
        // Configure HTTP bearer authorization: bearer
        HttpBearerAuth bearer = (HttpBearerAuth) defaultClient.getAuthentication("bearer");
        bearer.setBearerToken("BEARER TOKEN");

        PostsApi apiInstance = new PostsApi(defaultClient);
        String workspaceId = "workspaceId_example"; // String | 
        String from = "from_example"; // String | 
        String to = "to_example"; // String | 
        try {
            List<Post> result = apiInstance.postsList(workspaceId, from, to);
            System.out.println(result);
        } catch (ApiException e) {
            System.err.println("Exception when calling PostsApi#postsList");
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
| **to** | **String**|  | |

### Return type

[**List&lt;Post&gt;**](Post.md)


### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Success |  -  |
| **400** | The range ends before it starts, or spans more than 62 days. |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |
| **404** | No workspace with this id is open to the caller. |  -  |

## postsListWithHttpInfo

> ApiResponse<List<Post>> postsListWithHttpInfo(workspaceId, from, to)

List scheduled posts

Lists the posts scheduled from &#x60;from&#x60; (included) to &#x60;to&#x60; (excluded), at most 62 days apart, by scheduled instant, with their channels and how each went. Drafts have no time and are not listed; cancelled posts are, with the time they had. Needs post:read.

### Example

```java
// Import classes:
import social.peal.ApiClient;
import social.peal.ApiException;
import social.peal.ApiResponse;
import social.peal.Configuration;
import social.peal.auth.*;
import social.peal.models.*;
import social.peal.api.PostsApi;

public class Example {
    public static void main(String[] args) {
        ApiClient defaultClient = Configuration.getDefaultApiClient();
        defaultClient.setBasePath("https://app.peal.social");
        
        // Configure HTTP bearer authorization: bearer
        HttpBearerAuth bearer = (HttpBearerAuth) defaultClient.getAuthentication("bearer");
        bearer.setBearerToken("BEARER TOKEN");

        PostsApi apiInstance = new PostsApi(defaultClient);
        String workspaceId = "workspaceId_example"; // String | 
        String from = "from_example"; // String | 
        String to = "to_example"; // String | 
        try {
            ApiResponse<List<Post>> response = apiInstance.postsListWithHttpInfo(workspaceId, from, to);
            System.out.println("Status code: " + response.getStatusCode());
            System.out.println("Response headers: " + response.getHeaders());
            System.out.println("Response body: " + response.getData());
        } catch (ApiException e) {
            System.err.println("Exception when calling PostsApi#postsList");
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
| **workspaceId** | **String**|  | |
| **from** | **String**|  | |
| **to** | **String**|  | |

### Return type

ApiResponse<[**List&lt;Post&gt;**](Post.md)>


### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Success |  -  |
| **400** | The range ends before it starts, or spans more than 62 days. |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |
| **404** | No workspace with this id is open to the caller. |  -  |


## postsRepost

> Post postsRepost(workspaceId, postId, targetId)

Repost on a channel

Sends the post again, now, on one channel where it failed or is unconfirmed: a new round, with its own attempts. Check the platform first when it is unconfirmed, as it may be live already. Needs post:schedule.

### Example

```java
// Import classes:
import social.peal.ApiClient;
import social.peal.ApiException;
import social.peal.Configuration;
import social.peal.auth.*;
import social.peal.models.*;
import social.peal.api.PostsApi;

public class Example {
    public static void main(String[] args) {
        ApiClient defaultClient = Configuration.getDefaultApiClient();
        defaultClient.setBasePath("https://app.peal.social");
        
        // Configure HTTP bearer authorization: bearer
        HttpBearerAuth bearer = (HttpBearerAuth) defaultClient.getAuthentication("bearer");
        bearer.setBearerToken("BEARER TOKEN");

        PostsApi apiInstance = new PostsApi(defaultClient);
        String workspaceId = "workspaceId_example"; // String | 
        String postId = "postId_example"; // String | 
        String targetId = "targetId_example"; // String | 
        try {
            Post result = apiInstance.postsRepost(workspaceId, postId, targetId);
            System.out.println(result);
        } catch (ApiException e) {
            System.err.println("Exception when calling PostsApi#postsRepost");
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
| **targetId** | **String**|  | |

### Return type

[**Post**](Post.md)


### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Post |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |
| **404** | The workspace has no post with this id. | No workspace with this id is open to the caller. |  -  |
| **409** | The post&#39;s status does not allow this. &#x60;status&#x60; is the status it has. | The post&#39;s status on that channel does not allow this. &#x60;status&#x60; is the status it has. |  -  |

## postsRepostWithHttpInfo

> ApiResponse<Post> postsRepostWithHttpInfo(workspaceId, postId, targetId)

Repost on a channel

Sends the post again, now, on one channel where it failed or is unconfirmed: a new round, with its own attempts. Check the platform first when it is unconfirmed, as it may be live already. Needs post:schedule.

### Example

```java
// Import classes:
import social.peal.ApiClient;
import social.peal.ApiException;
import social.peal.ApiResponse;
import social.peal.Configuration;
import social.peal.auth.*;
import social.peal.models.*;
import social.peal.api.PostsApi;

public class Example {
    public static void main(String[] args) {
        ApiClient defaultClient = Configuration.getDefaultApiClient();
        defaultClient.setBasePath("https://app.peal.social");
        
        // Configure HTTP bearer authorization: bearer
        HttpBearerAuth bearer = (HttpBearerAuth) defaultClient.getAuthentication("bearer");
        bearer.setBearerToken("BEARER TOKEN");

        PostsApi apiInstance = new PostsApi(defaultClient);
        String workspaceId = "workspaceId_example"; // String | 
        String postId = "postId_example"; // String | 
        String targetId = "targetId_example"; // String | 
        try {
            ApiResponse<Post> response = apiInstance.postsRepostWithHttpInfo(workspaceId, postId, targetId);
            System.out.println("Status code: " + response.getStatusCode());
            System.out.println("Response headers: " + response.getHeaders());
            System.out.println("Response body: " + response.getData());
        } catch (ApiException e) {
            System.err.println("Exception when calling PostsApi#postsRepost");
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
| **workspaceId** | **String**|  | |
| **postId** | **String**|  | |
| **targetId** | **String**|  | |

### Return type

ApiResponse<[**Post**](Post.md)>


### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Post |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |
| **404** | The workspace has no post with this id. | No workspace with this id is open to the caller. |  -  |
| **409** | The post&#39;s status does not allow this. &#x60;status&#x60; is the status it has. | The post&#39;s status on that channel does not allow this. &#x60;status&#x60; is the status it has. |  -  |


## postsReschedule

> Post postsReschedule(workspaceId, postId, postSchedule)

Reschedule a post

Moves a scheduled post to another instant, or schedules a draft on the channels it has. Moved to another month, or scheduled, it must fit that month&#39;s posts in the workspace&#39;s plan (PlanLimitReached). Needs post:schedule, and channel:read for a draft.

### Example

```java
// Import classes:
import social.peal.ApiClient;
import social.peal.ApiException;
import social.peal.Configuration;
import social.peal.auth.*;
import social.peal.models.*;
import social.peal.api.PostsApi;

public class Example {
    public static void main(String[] args) {
        ApiClient defaultClient = Configuration.getDefaultApiClient();
        defaultClient.setBasePath("https://app.peal.social");
        
        // Configure HTTP bearer authorization: bearer
        HttpBearerAuth bearer = (HttpBearerAuth) defaultClient.getAuthentication("bearer");
        bearer.setBearerToken("BEARER TOKEN");

        PostsApi apiInstance = new PostsApi(defaultClient);
        String workspaceId = "workspaceId_example"; // String | 
        String postId = "postId_example"; // String | 
        PostSchedule postSchedule = new PostSchedule(); // PostSchedule | 
        try {
            Post result = apiInstance.postsReschedule(workspaceId, postId, postSchedule);
            System.out.println(result);
        } catch (ApiException e) {
            System.err.println("Exception when calling PostsApi#postsReschedule");
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
| **postSchedule** | [**PostSchedule**](PostSchedule.md)|  | |

### Return type

[**Post**](Post.md)


### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Post |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **402** | The workspace&#39;s plan allows no more of &#x60;limit&#x60;: it has &#x60;allowed&#x60; already. A larger plan, or removing some, makes room. Nothing was changed. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |
| **404** | The workspace has no post with this id. | No workspace with this id is open to the caller. |  -  |
| **409** | The post&#39;s status does not allow this. &#x60;status&#x60; is the status it has. |  -  |
| **422** | The time asked for has passed. A time up to a minute ago publishes now. | The time zone is not an IANA time zone such as Europe/Paris. Offsets such as +01:00 are refused. | The post&#39;s content breaks the rules of its channels&#39; platforms: &#x60;violations&#x60; says how, channel by channel, for its images and videos, media by media, and for its options on a channel, option by option (&#x60;field&#x60;). | Some channels asked for are not connected to the workspace: &#x60;channelIds&#x60; lists them. | Some media attached are not the workspace&#39;s, or not ready to show: &#x60;mediaIds&#x60; lists them. |  -  |

## postsRescheduleWithHttpInfo

> ApiResponse<Post> postsRescheduleWithHttpInfo(workspaceId, postId, postSchedule)

Reschedule a post

Moves a scheduled post to another instant, or schedules a draft on the channels it has. Moved to another month, or scheduled, it must fit that month&#39;s posts in the workspace&#39;s plan (PlanLimitReached). Needs post:schedule, and channel:read for a draft.

### Example

```java
// Import classes:
import social.peal.ApiClient;
import social.peal.ApiException;
import social.peal.ApiResponse;
import social.peal.Configuration;
import social.peal.auth.*;
import social.peal.models.*;
import social.peal.api.PostsApi;

public class Example {
    public static void main(String[] args) {
        ApiClient defaultClient = Configuration.getDefaultApiClient();
        defaultClient.setBasePath("https://app.peal.social");
        
        // Configure HTTP bearer authorization: bearer
        HttpBearerAuth bearer = (HttpBearerAuth) defaultClient.getAuthentication("bearer");
        bearer.setBearerToken("BEARER TOKEN");

        PostsApi apiInstance = new PostsApi(defaultClient);
        String workspaceId = "workspaceId_example"; // String | 
        String postId = "postId_example"; // String | 
        PostSchedule postSchedule = new PostSchedule(); // PostSchedule | 
        try {
            ApiResponse<Post> response = apiInstance.postsRescheduleWithHttpInfo(workspaceId, postId, postSchedule);
            System.out.println("Status code: " + response.getStatusCode());
            System.out.println("Response headers: " + response.getHeaders());
            System.out.println("Response body: " + response.getData());
        } catch (ApiException e) {
            System.err.println("Exception when calling PostsApi#postsReschedule");
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
| **workspaceId** | **String**|  | |
| **postId** | **String**|  | |
| **postSchedule** | [**PostSchedule**](PostSchedule.md)|  | |

### Return type

ApiResponse<[**Post**](Post.md)>


### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Post |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **402** | The workspace&#39;s plan allows no more of &#x60;limit&#x60;: it has &#x60;allowed&#x60; already. A larger plan, or removing some, makes room. Nothing was changed. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |
| **404** | The workspace has no post with this id. | No workspace with this id is open to the caller. |  -  |
| **409** | The post&#39;s status does not allow this. &#x60;status&#x60; is the status it has. |  -  |
| **422** | The time asked for has passed. A time up to a minute ago publishes now. | The time zone is not an IANA time zone such as Europe/Paris. Offsets such as +01:00 are refused. | The post&#39;s content breaks the rules of its channels&#39; platforms: &#x60;violations&#x60; says how, channel by channel, for its images and videos, media by media, and for its options on a channel, option by option (&#x60;field&#x60;). | Some channels asked for are not connected to the workspace: &#x60;channelIds&#x60; lists them. | Some media attached are not the workspace&#39;s, or not ready to show: &#x60;mediaIds&#x60; lists them. |  -  |


## postsSchedule

> Post postsSchedule(workspaceId, postId, schedulePost)

Schedule a draft

Schedules a draft on some of the workspace&#39;s channels at an instant, kept with the IANA time zone it was chosen in. The content must fit each platform&#39;s rules, its media included: file types, sizes, durations, dimensions, alt text, how many videos, and whether images and videos go together. A channel whose platform takes options needs those it requires, as the draft gives them on that channel: a channel the draft was not for has none yet. A time up to a minute ago publishes now. On a server that bills, the posts going out in that month (UTC) must fit the workspace&#39;s plan (PlanLimitReached). Needs post:schedule and channel:read, and media:read when it shows media.

### Example

```java
// Import classes:
import social.peal.ApiClient;
import social.peal.ApiException;
import social.peal.Configuration;
import social.peal.auth.*;
import social.peal.models.*;
import social.peal.api.PostsApi;

public class Example {
    public static void main(String[] args) {
        ApiClient defaultClient = Configuration.getDefaultApiClient();
        defaultClient.setBasePath("https://app.peal.social");
        
        // Configure HTTP bearer authorization: bearer
        HttpBearerAuth bearer = (HttpBearerAuth) defaultClient.getAuthentication("bearer");
        bearer.setBearerToken("BEARER TOKEN");

        PostsApi apiInstance = new PostsApi(defaultClient);
        String workspaceId = "workspaceId_example"; // String | 
        String postId = "postId_example"; // String | 
        SchedulePost schedulePost = new SchedulePost(); // SchedulePost | 
        try {
            Post result = apiInstance.postsSchedule(workspaceId, postId, schedulePost);
            System.out.println(result);
        } catch (ApiException e) {
            System.err.println("Exception when calling PostsApi#postsSchedule");
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
| **schedulePost** | [**SchedulePost**](SchedulePost.md)|  | |

### Return type

[**Post**](Post.md)


### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Post |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **402** | The workspace&#39;s plan allows no more of &#x60;limit&#x60;: it has &#x60;allowed&#x60; already. A larger plan, or removing some, makes room. Nothing was changed. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |
| **404** | The workspace has no post with this id. | No workspace with this id is open to the caller. |  -  |
| **409** | The post&#39;s status does not allow this. &#x60;status&#x60; is the status it has. |  -  |
| **422** | The time asked for has passed. A time up to a minute ago publishes now. | The time zone is not an IANA time zone such as Europe/Paris. Offsets such as +01:00 are refused. | The post&#39;s content breaks the rules of its channels&#39; platforms: &#x60;violations&#x60; says how, channel by channel, for its images and videos, media by media, and for its options on a channel, option by option (&#x60;field&#x60;). | Some channels asked for are not connected to the workspace: &#x60;channelIds&#x60; lists them. | Some media attached are not the workspace&#39;s, or not ready to show: &#x60;mediaIds&#x60; lists them. |  -  |

## postsScheduleWithHttpInfo

> ApiResponse<Post> postsScheduleWithHttpInfo(workspaceId, postId, schedulePost)

Schedule a draft

Schedules a draft on some of the workspace&#39;s channels at an instant, kept with the IANA time zone it was chosen in. The content must fit each platform&#39;s rules, its media included: file types, sizes, durations, dimensions, alt text, how many videos, and whether images and videos go together. A channel whose platform takes options needs those it requires, as the draft gives them on that channel: a channel the draft was not for has none yet. A time up to a minute ago publishes now. On a server that bills, the posts going out in that month (UTC) must fit the workspace&#39;s plan (PlanLimitReached). Needs post:schedule and channel:read, and media:read when it shows media.

### Example

```java
// Import classes:
import social.peal.ApiClient;
import social.peal.ApiException;
import social.peal.ApiResponse;
import social.peal.Configuration;
import social.peal.auth.*;
import social.peal.models.*;
import social.peal.api.PostsApi;

public class Example {
    public static void main(String[] args) {
        ApiClient defaultClient = Configuration.getDefaultApiClient();
        defaultClient.setBasePath("https://app.peal.social");
        
        // Configure HTTP bearer authorization: bearer
        HttpBearerAuth bearer = (HttpBearerAuth) defaultClient.getAuthentication("bearer");
        bearer.setBearerToken("BEARER TOKEN");

        PostsApi apiInstance = new PostsApi(defaultClient);
        String workspaceId = "workspaceId_example"; // String | 
        String postId = "postId_example"; // String | 
        SchedulePost schedulePost = new SchedulePost(); // SchedulePost | 
        try {
            ApiResponse<Post> response = apiInstance.postsScheduleWithHttpInfo(workspaceId, postId, schedulePost);
            System.out.println("Status code: " + response.getStatusCode());
            System.out.println("Response headers: " + response.getHeaders());
            System.out.println("Response body: " + response.getData());
        } catch (ApiException e) {
            System.err.println("Exception when calling PostsApi#postsSchedule");
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
| **workspaceId** | **String**|  | |
| **postId** | **String**|  | |
| **schedulePost** | [**SchedulePost**](SchedulePost.md)|  | |

### Return type

ApiResponse<[**Post**](Post.md)>


### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Post |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **402** | The workspace&#39;s plan allows no more of &#x60;limit&#x60;: it has &#x60;allowed&#x60; already. A larger plan, or removing some, makes room. Nothing was changed. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |
| **404** | The workspace has no post with this id. | No workspace with this id is open to the caller. |  -  |
| **409** | The post&#39;s status does not allow this. &#x60;status&#x60; is the status it has. |  -  |
| **422** | The time asked for has passed. A time up to a minute ago publishes now. | The time zone is not an IANA time zone such as Europe/Paris. Offsets such as +01:00 are refused. | The post&#39;s content breaks the rules of its channels&#39; platforms: &#x60;violations&#x60; says how, channel by channel, for its images and videos, media by media, and for its options on a channel, option by option (&#x60;field&#x60;). | Some channels asked for are not connected to the workspace: &#x60;channelIds&#x60; lists them. | Some media attached are not the workspace&#39;s, or not ready to show: &#x60;mediaIds&#x60; lists them. |  -  |


## postsUnschedule

> Post postsUnschedule(workspaceId, postId)

Unschedule a post

Takes a scheduled post back to draft, so its text and media can change: it goes out at no time until it is scheduled again. A post already publishing is a conflict. Needs post:schedule.

### Example

```java
// Import classes:
import social.peal.ApiClient;
import social.peal.ApiException;
import social.peal.Configuration;
import social.peal.auth.*;
import social.peal.models.*;
import social.peal.api.PostsApi;

public class Example {
    public static void main(String[] args) {
        ApiClient defaultClient = Configuration.getDefaultApiClient();
        defaultClient.setBasePath("https://app.peal.social");
        
        // Configure HTTP bearer authorization: bearer
        HttpBearerAuth bearer = (HttpBearerAuth) defaultClient.getAuthentication("bearer");
        bearer.setBearerToken("BEARER TOKEN");

        PostsApi apiInstance = new PostsApi(defaultClient);
        String workspaceId = "workspaceId_example"; // String | 
        String postId = "postId_example"; // String | 
        try {
            Post result = apiInstance.postsUnschedule(workspaceId, postId);
            System.out.println(result);
        } catch (ApiException e) {
            System.err.println("Exception when calling PostsApi#postsUnschedule");
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

[**Post**](Post.md)


### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Post |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |
| **404** | The workspace has no post with this id. | No workspace with this id is open to the caller. |  -  |
| **409** | The post&#39;s status does not allow this. &#x60;status&#x60; is the status it has. |  -  |

## postsUnscheduleWithHttpInfo

> ApiResponse<Post> postsUnscheduleWithHttpInfo(workspaceId, postId)

Unschedule a post

Takes a scheduled post back to draft, so its text and media can change: it goes out at no time until it is scheduled again. A post already publishing is a conflict. Needs post:schedule.

### Example

```java
// Import classes:
import social.peal.ApiClient;
import social.peal.ApiException;
import social.peal.ApiResponse;
import social.peal.Configuration;
import social.peal.auth.*;
import social.peal.models.*;
import social.peal.api.PostsApi;

public class Example {
    public static void main(String[] args) {
        ApiClient defaultClient = Configuration.getDefaultApiClient();
        defaultClient.setBasePath("https://app.peal.social");
        
        // Configure HTTP bearer authorization: bearer
        HttpBearerAuth bearer = (HttpBearerAuth) defaultClient.getAuthentication("bearer");
        bearer.setBearerToken("BEARER TOKEN");

        PostsApi apiInstance = new PostsApi(defaultClient);
        String workspaceId = "workspaceId_example"; // String | 
        String postId = "postId_example"; // String | 
        try {
            ApiResponse<Post> response = apiInstance.postsUnscheduleWithHttpInfo(workspaceId, postId);
            System.out.println("Status code: " + response.getStatusCode());
            System.out.println("Response headers: " + response.getHeaders());
            System.out.println("Response body: " + response.getData());
        } catch (ApiException e) {
            System.err.println("Exception when calling PostsApi#postsUnschedule");
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
| **workspaceId** | **String**|  | |
| **postId** | **String**|  | |

### Return type

ApiResponse<[**Post**](Post.md)>


### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Post |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |
| **404** | The workspace has no post with this id. | No workspace with this id is open to the caller. |  -  |
| **409** | The post&#39;s status does not allow this. &#x60;status&#x60; is the status it has. |  -  |


## postsUpdate

> Post postsUpdate(workspaceId, postId, postDraft)

Update a draft

Replaces a draft&#39;s content, channels and options: options left out are removed. A post that is no longer a draft is a conflict. Needs post:update, channel:read, and media:read when it shows media.

### Example

```java
// Import classes:
import social.peal.ApiClient;
import social.peal.ApiException;
import social.peal.Configuration;
import social.peal.auth.*;
import social.peal.models.*;
import social.peal.api.PostsApi;

public class Example {
    public static void main(String[] args) {
        ApiClient defaultClient = Configuration.getDefaultApiClient();
        defaultClient.setBasePath("https://app.peal.social");
        
        // Configure HTTP bearer authorization: bearer
        HttpBearerAuth bearer = (HttpBearerAuth) defaultClient.getAuthentication("bearer");
        bearer.setBearerToken("BEARER TOKEN");

        PostsApi apiInstance = new PostsApi(defaultClient);
        String workspaceId = "workspaceId_example"; // String | 
        String postId = "postId_example"; // String | 
        PostDraft postDraft = new PostDraft(); // PostDraft | 
        try {
            Post result = apiInstance.postsUpdate(workspaceId, postId, postDraft);
            System.out.println(result);
        } catch (ApiException e) {
            System.err.println("Exception when calling PostsApi#postsUpdate");
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
| **postDraft** | [**PostDraft**](PostDraft.md)|  | |

### Return type

[**Post**](Post.md)


### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Post |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |
| **404** | The workspace has no post with this id. | No workspace with this id is open to the caller. |  -  |
| **409** | The post&#39;s status does not allow this. &#x60;status&#x60; is the status it has. |  -  |
| **422** | The post&#39;s content breaks the rules of its channels&#39; platforms: &#x60;violations&#x60; says how, channel by channel, for its images and videos, media by media, and for its options on a channel, option by option (&#x60;field&#x60;). | Some channels asked for are not connected to the workspace: &#x60;channelIds&#x60; lists them. | Some media attached are not the workspace&#39;s, or not ready to show: &#x60;mediaIds&#x60; lists them. |  -  |

## postsUpdateWithHttpInfo

> ApiResponse<Post> postsUpdateWithHttpInfo(workspaceId, postId, postDraft)

Update a draft

Replaces a draft&#39;s content, channels and options: options left out are removed. A post that is no longer a draft is a conflict. Needs post:update, channel:read, and media:read when it shows media.

### Example

```java
// Import classes:
import social.peal.ApiClient;
import social.peal.ApiException;
import social.peal.ApiResponse;
import social.peal.Configuration;
import social.peal.auth.*;
import social.peal.models.*;
import social.peal.api.PostsApi;

public class Example {
    public static void main(String[] args) {
        ApiClient defaultClient = Configuration.getDefaultApiClient();
        defaultClient.setBasePath("https://app.peal.social");
        
        // Configure HTTP bearer authorization: bearer
        HttpBearerAuth bearer = (HttpBearerAuth) defaultClient.getAuthentication("bearer");
        bearer.setBearerToken("BEARER TOKEN");

        PostsApi apiInstance = new PostsApi(defaultClient);
        String workspaceId = "workspaceId_example"; // String | 
        String postId = "postId_example"; // String | 
        PostDraft postDraft = new PostDraft(); // PostDraft | 
        try {
            ApiResponse<Post> response = apiInstance.postsUpdateWithHttpInfo(workspaceId, postId, postDraft);
            System.out.println("Status code: " + response.getStatusCode());
            System.out.println("Response headers: " + response.getHeaders());
            System.out.println("Response body: " + response.getData());
        } catch (ApiException e) {
            System.err.println("Exception when calling PostsApi#postsUpdate");
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
| **workspaceId** | **String**|  | |
| **postId** | **String**|  | |
| **postDraft** | [**PostDraft**](PostDraft.md)|  | |

### Return type

ApiResponse<[**Post**](Post.md)>


### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Post |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |
| **404** | The workspace has no post with this id. | No workspace with this id is open to the caller. |  -  |
| **409** | The post&#39;s status does not allow this. &#x60;status&#x60; is the status it has. |  -  |
| **422** | The post&#39;s content breaks the rules of its channels&#39; platforms: &#x60;violations&#x60; says how, channel by channel, for its images and videos, media by media, and for its options on a channel, option by option (&#x60;field&#x60;). | Some channels asked for are not connected to the workspace: &#x60;channelIds&#x60; lists them. | Some media attached are not the workspace&#39;s, or not ready to show: &#x60;mediaIds&#x60; lists them. |  -  |

