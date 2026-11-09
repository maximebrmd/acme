# MediaApi

All URIs are relative to *https://app.peal.social*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**mediaComplete**](MediaApi.md#mediaComplete) | **POST** /api/workspaces/{workspaceId}/media/{mediaId}/complete | Complete an upload |
| [**mediaCompleteWithHttpInfo**](MediaApi.md#mediaCompleteWithHttpInfo) | **POST** /api/workspaces/{workspaceId}/media/{mediaId}/complete | Complete an upload |
| [**mediaCreate**](MediaApi.md#mediaCreate) | **POST** /api/workspaces/{workspaceId}/media | Start an upload |
| [**mediaCreateWithHttpInfo**](MediaApi.md#mediaCreateWithHttpInfo) | **POST** /api/workspaces/{workspaceId}/media | Start an upload |
| [**mediaDelete**](MediaApi.md#mediaDelete) | **DELETE** /api/workspaces/{workspaceId}/media/{mediaId} | Delete media |
| [**mediaDeleteWithHttpInfo**](MediaApi.md#mediaDeleteWithHttpInfo) | **DELETE** /api/workspaces/{workspaceId}/media/{mediaId} | Delete media |
| [**mediaDescribe**](MediaApi.md#mediaDescribe) | **PATCH** /api/workspaces/{workspaceId}/media/{mediaId} | Describe media |
| [**mediaDescribeWithHttpInfo**](MediaApi.md#mediaDescribeWithHttpInfo) | **PATCH** /api/workspaces/{workspaceId}/media/{mediaId} | Describe media |
| [**mediaGet**](MediaApi.md#mediaGet) | **GET** /api/workspaces/{workspaceId}/media/{mediaId} | Get media |
| [**mediaGetWithHttpInfo**](MediaApi.md#mediaGetWithHttpInfo) | **GET** /api/workspaces/{workspaceId}/media/{mediaId} | Get media |
| [**mediaList**](MediaApi.md#mediaList) | **GET** /api/workspaces/{workspaceId}/media | List media |
| [**mediaListWithHttpInfo**](MediaApi.md#mediaListWithHttpInfo) | **GET** /api/workspaces/{workspaceId}/media | List media |
| [**mediaUsage**](MediaApi.md#mediaUsage) | **GET** /api/workspaces/{workspaceId}/media/{mediaId}/usage | Get where media is used |
| [**mediaUsageWithHttpInfo**](MediaApi.md#mediaUsageWithHttpInfo) | **GET** /api/workspaces/{workspaceId}/media/{mediaId}/usage | Get where media is used |



## mediaComplete

> Media mediaComplete(workspaceId, mediaId)

Complete an upload

Checks that the file reached the store with the declared size and type, joining its parts first, then probes it: the media is ready, or stays uploaded with why it could not be probed. Calling it again is safe, and probes an uploaded file again. Needs media:upload.

### Example

```java
// Import classes:
import social.peal.ApiClient;
import social.peal.ApiException;
import social.peal.Configuration;
import social.peal.auth.*;
import social.peal.models.*;
import social.peal.api.MediaApi;

public class Example {
    public static void main(String[] args) {
        ApiClient defaultClient = Configuration.getDefaultApiClient();
        defaultClient.setBasePath("https://app.peal.social");
        
        // Configure HTTP bearer authorization: bearer
        HttpBearerAuth bearer = (HttpBearerAuth) defaultClient.getAuthentication("bearer");
        bearer.setBearerToken("BEARER TOKEN");

        MediaApi apiInstance = new MediaApi(defaultClient);
        String workspaceId = "workspaceId_example"; // String | 
        String mediaId = "mediaId_example"; // String | 
        try {
            Media result = apiInstance.mediaComplete(workspaceId, mediaId);
            System.out.println(result);
        } catch (ApiException e) {
            System.err.println("Exception when calling MediaApi#mediaComplete");
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
| **mediaId** | **String**|  | |

### Return type

[**Media**](Media.md)


### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Media |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |
| **404** | The workspace has no media with this id. | No workspace with this id is open to the caller. |  -  |
| **409** | The file, or one of its parts, has not reached the store yet. Send what is missing, then complete the upload again. |  -  |
| **422** | The stored file does not have the declared size or type. It was deleted, and the media is rejected. |  -  |
| **503** | The server cannot reach its media store right now. Try again later. |  -  |

## mediaCompleteWithHttpInfo

> ApiResponse<Media> mediaCompleteWithHttpInfo(workspaceId, mediaId)

Complete an upload

Checks that the file reached the store with the declared size and type, joining its parts first, then probes it: the media is ready, or stays uploaded with why it could not be probed. Calling it again is safe, and probes an uploaded file again. Needs media:upload.

### Example

```java
// Import classes:
import social.peal.ApiClient;
import social.peal.ApiException;
import social.peal.ApiResponse;
import social.peal.Configuration;
import social.peal.auth.*;
import social.peal.models.*;
import social.peal.api.MediaApi;

public class Example {
    public static void main(String[] args) {
        ApiClient defaultClient = Configuration.getDefaultApiClient();
        defaultClient.setBasePath("https://app.peal.social");
        
        // Configure HTTP bearer authorization: bearer
        HttpBearerAuth bearer = (HttpBearerAuth) defaultClient.getAuthentication("bearer");
        bearer.setBearerToken("BEARER TOKEN");

        MediaApi apiInstance = new MediaApi(defaultClient);
        String workspaceId = "workspaceId_example"; // String | 
        String mediaId = "mediaId_example"; // String | 
        try {
            ApiResponse<Media> response = apiInstance.mediaCompleteWithHttpInfo(workspaceId, mediaId);
            System.out.println("Status code: " + response.getStatusCode());
            System.out.println("Response headers: " + response.getHeaders());
            System.out.println("Response body: " + response.getData());
        } catch (ApiException e) {
            System.err.println("Exception when calling MediaApi#mediaComplete");
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
| **mediaId** | **String**|  | |

### Return type

ApiResponse<[**Media**](Media.md)>


### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Media |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |
| **404** | The workspace has no media with this id. | No workspace with this id is open to the caller. |  -  |
| **409** | The file, or one of its parts, has not reached the store yet. Send what is missing, then complete the upload again. |  -  |
| **422** | The stored file does not have the declared size or type. It was deleted, and the media is rejected. |  -  |
| **503** | The server cannot reach its media store right now. Try again later. |  -  |


## mediaCreate

> PreparedUpload mediaCreate(workspaceId, newUpload)

Start an upload

Records pending media and signs the upload of its file: one PUT for an image or a video up to 16 MiB, one PUT per part for a larger video. Send the file with them, then complete the upload. The requests only take the declared size and content type. Needs media:upload.

### Example

```java
// Import classes:
import social.peal.ApiClient;
import social.peal.ApiException;
import social.peal.Configuration;
import social.peal.auth.*;
import social.peal.models.*;
import social.peal.api.MediaApi;

public class Example {
    public static void main(String[] args) {
        ApiClient defaultClient = Configuration.getDefaultApiClient();
        defaultClient.setBasePath("https://app.peal.social");
        
        // Configure HTTP bearer authorization: bearer
        HttpBearerAuth bearer = (HttpBearerAuth) defaultClient.getAuthentication("bearer");
        bearer.setBearerToken("BEARER TOKEN");

        MediaApi apiInstance = new MediaApi(defaultClient);
        String workspaceId = "workspaceId_example"; // String | 
        NewUpload newUpload = new NewUpload(); // NewUpload | 
        try {
            PreparedUpload result = apiInstance.mediaCreate(workspaceId, newUpload);
            System.out.println(result);
        } catch (ApiException e) {
            System.err.println("Exception when calling MediaApi#mediaCreate");
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
| **newUpload** | [**NewUpload**](NewUpload.md)|  | |

### Return type

[**PreparedUpload**](PreparedUpload.md)


### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **201** | PreparedUpload |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |
| **404** | No workspace with this id is open to the caller. |  -  |
| **422** | Peal does not store files of this content type. It takes JPEG, PNG, GIF and WebP images, and MP4 and QuickTime videos. | The file is larger than Peal stores for its kind: 16 MiB for an image, 1 GiB for a video. | The description is longer than Peal keeps. |  -  |
| **503** | The server cannot reach its media store right now. Try again later. |  -  |

## mediaCreateWithHttpInfo

> ApiResponse<PreparedUpload> mediaCreateWithHttpInfo(workspaceId, newUpload)

Start an upload

Records pending media and signs the upload of its file: one PUT for an image or a video up to 16 MiB, one PUT per part for a larger video. Send the file with them, then complete the upload. The requests only take the declared size and content type. Needs media:upload.

### Example

```java
// Import classes:
import social.peal.ApiClient;
import social.peal.ApiException;
import social.peal.ApiResponse;
import social.peal.Configuration;
import social.peal.auth.*;
import social.peal.models.*;
import social.peal.api.MediaApi;

public class Example {
    public static void main(String[] args) {
        ApiClient defaultClient = Configuration.getDefaultApiClient();
        defaultClient.setBasePath("https://app.peal.social");
        
        // Configure HTTP bearer authorization: bearer
        HttpBearerAuth bearer = (HttpBearerAuth) defaultClient.getAuthentication("bearer");
        bearer.setBearerToken("BEARER TOKEN");

        MediaApi apiInstance = new MediaApi(defaultClient);
        String workspaceId = "workspaceId_example"; // String | 
        NewUpload newUpload = new NewUpload(); // NewUpload | 
        try {
            ApiResponse<PreparedUpload> response = apiInstance.mediaCreateWithHttpInfo(workspaceId, newUpload);
            System.out.println("Status code: " + response.getStatusCode());
            System.out.println("Response headers: " + response.getHeaders());
            System.out.println("Response body: " + response.getData());
        } catch (ApiException e) {
            System.err.println("Exception when calling MediaApi#mediaCreate");
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
| **newUpload** | [**NewUpload**](NewUpload.md)|  | |

### Return type

ApiResponse<[**PreparedUpload**](PreparedUpload.md)>


### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **201** | PreparedUpload |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |
| **404** | No workspace with this id is open to the caller. |  -  |
| **422** | Peal does not store files of this content type. It takes JPEG, PNG, GIF and WebP images, and MP4 and QuickTime videos. | The file is larger than Peal stores for its kind: 16 MiB for an image, 1 GiB for a video. | The description is longer than Peal keeps. |  -  |
| **503** | The server cannot reach its media store right now. Try again later. |  -  |


## mediaDelete

> void mediaDelete(workspaceId, mediaId)

Delete media

Deletes the media and its file, and cancels its upload if it is still pending. Drafts that show it lose it. Posts scheduled or publishing that show it refuse the deletion (&#x60;MediaInUse&#x60;, listing them): take them back to draft first. Needs media:delete.

### Example

```java
// Import classes:
import social.peal.ApiClient;
import social.peal.ApiException;
import social.peal.Configuration;
import social.peal.auth.*;
import social.peal.models.*;
import social.peal.api.MediaApi;

public class Example {
    public static void main(String[] args) {
        ApiClient defaultClient = Configuration.getDefaultApiClient();
        defaultClient.setBasePath("https://app.peal.social");
        
        // Configure HTTP bearer authorization: bearer
        HttpBearerAuth bearer = (HttpBearerAuth) defaultClient.getAuthentication("bearer");
        bearer.setBearerToken("BEARER TOKEN");

        MediaApi apiInstance = new MediaApi(defaultClient);
        String workspaceId = "workspaceId_example"; // String | 
        String mediaId = "mediaId_example"; // String | 
        try {
            apiInstance.mediaDelete(workspaceId, mediaId);
        } catch (ApiException e) {
            System.err.println("Exception when calling MediaApi#mediaDelete");
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
| **mediaId** | **String**|  | |

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
| **404** | The workspace has no media with this id. | No workspace with this id is open to the caller. |  -  |
| **409** | Posts that are scheduled or publishing show the media. &#x60;postIds&#x60; lists them. |  -  |
| **503** | The server cannot reach its media store right now. Try again later. |  -  |

## mediaDeleteWithHttpInfo

> ApiResponse<Void> mediaDeleteWithHttpInfo(workspaceId, mediaId)

Delete media

Deletes the media and its file, and cancels its upload if it is still pending. Drafts that show it lose it. Posts scheduled or publishing that show it refuse the deletion (&#x60;MediaInUse&#x60;, listing them): take them back to draft first. Needs media:delete.

### Example

```java
// Import classes:
import social.peal.ApiClient;
import social.peal.ApiException;
import social.peal.ApiResponse;
import social.peal.Configuration;
import social.peal.auth.*;
import social.peal.models.*;
import social.peal.api.MediaApi;

public class Example {
    public static void main(String[] args) {
        ApiClient defaultClient = Configuration.getDefaultApiClient();
        defaultClient.setBasePath("https://app.peal.social");
        
        // Configure HTTP bearer authorization: bearer
        HttpBearerAuth bearer = (HttpBearerAuth) defaultClient.getAuthentication("bearer");
        bearer.setBearerToken("BEARER TOKEN");

        MediaApi apiInstance = new MediaApi(defaultClient);
        String workspaceId = "workspaceId_example"; // String | 
        String mediaId = "mediaId_example"; // String | 
        try {
            ApiResponse<Void> response = apiInstance.mediaDeleteWithHttpInfo(workspaceId, mediaId);
            System.out.println("Status code: " + response.getStatusCode());
            System.out.println("Response headers: " + response.getHeaders());
        } catch (ApiException e) {
            System.err.println("Exception when calling MediaApi#mediaDelete");
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
| **mediaId** | **String**|  | |

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
| **404** | The workspace has no media with this id. | No workspace with this id is open to the caller. |  -  |
| **409** | Posts that are scheduled or publishing show the media. &#x60;postIds&#x60; lists them. |  -  |
| **503** | The server cannot reach its media store right now. Try again later. |  -  |


## mediaDescribe

> Media mediaDescribe(workspaceId, mediaId, mediaDescription)

Describe media

Sets the media&#39;s description, which platforms show to people who cannot see it. It can be written while the file uploads. Needs media:upload.

### Example

```java
// Import classes:
import social.peal.ApiClient;
import social.peal.ApiException;
import social.peal.Configuration;
import social.peal.auth.*;
import social.peal.models.*;
import social.peal.api.MediaApi;

public class Example {
    public static void main(String[] args) {
        ApiClient defaultClient = Configuration.getDefaultApiClient();
        defaultClient.setBasePath("https://app.peal.social");
        
        // Configure HTTP bearer authorization: bearer
        HttpBearerAuth bearer = (HttpBearerAuth) defaultClient.getAuthentication("bearer");
        bearer.setBearerToken("BEARER TOKEN");

        MediaApi apiInstance = new MediaApi(defaultClient);
        String workspaceId = "workspaceId_example"; // String | 
        String mediaId = "mediaId_example"; // String | 
        MediaDescription mediaDescription = new MediaDescription(); // MediaDescription | 
        try {
            Media result = apiInstance.mediaDescribe(workspaceId, mediaId, mediaDescription);
            System.out.println(result);
        } catch (ApiException e) {
            System.err.println("Exception when calling MediaApi#mediaDescribe");
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
| **mediaId** | **String**|  | |
| **mediaDescription** | [**MediaDescription**](MediaDescription.md)|  | |

### Return type

[**Media**](Media.md)


### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Media |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |
| **404** | The workspace has no media with this id. | No workspace with this id is open to the caller. |  -  |
| **422** | The description is longer than Peal keeps. |  -  |
| **503** | The server cannot reach its media store right now. Try again later. |  -  |

## mediaDescribeWithHttpInfo

> ApiResponse<Media> mediaDescribeWithHttpInfo(workspaceId, mediaId, mediaDescription)

Describe media

Sets the media&#39;s description, which platforms show to people who cannot see it. It can be written while the file uploads. Needs media:upload.

### Example

```java
// Import classes:
import social.peal.ApiClient;
import social.peal.ApiException;
import social.peal.ApiResponse;
import social.peal.Configuration;
import social.peal.auth.*;
import social.peal.models.*;
import social.peal.api.MediaApi;

public class Example {
    public static void main(String[] args) {
        ApiClient defaultClient = Configuration.getDefaultApiClient();
        defaultClient.setBasePath("https://app.peal.social");
        
        // Configure HTTP bearer authorization: bearer
        HttpBearerAuth bearer = (HttpBearerAuth) defaultClient.getAuthentication("bearer");
        bearer.setBearerToken("BEARER TOKEN");

        MediaApi apiInstance = new MediaApi(defaultClient);
        String workspaceId = "workspaceId_example"; // String | 
        String mediaId = "mediaId_example"; // String | 
        MediaDescription mediaDescription = new MediaDescription(); // MediaDescription | 
        try {
            ApiResponse<Media> response = apiInstance.mediaDescribeWithHttpInfo(workspaceId, mediaId, mediaDescription);
            System.out.println("Status code: " + response.getStatusCode());
            System.out.println("Response headers: " + response.getHeaders());
            System.out.println("Response body: " + response.getData());
        } catch (ApiException e) {
            System.err.println("Exception when calling MediaApi#mediaDescribe");
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
| **mediaId** | **String**|  | |
| **mediaDescription** | [**MediaDescription**](MediaDescription.md)|  | |

### Return type

ApiResponse<[**Media**](Media.md)>


### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Media |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |
| **404** | The workspace has no media with this id. | No workspace with this id is open to the caller. |  -  |
| **422** | The description is longer than Peal keeps. |  -  |
| **503** | The server cannot reach its media store right now. Try again later. |  -  |


## mediaGet

> Media mediaGet(workspaceId, mediaId)

Get media

Shows one of the workspace&#39;s media. Needs media:read.

### Example

```java
// Import classes:
import social.peal.ApiClient;
import social.peal.ApiException;
import social.peal.Configuration;
import social.peal.auth.*;
import social.peal.models.*;
import social.peal.api.MediaApi;

public class Example {
    public static void main(String[] args) {
        ApiClient defaultClient = Configuration.getDefaultApiClient();
        defaultClient.setBasePath("https://app.peal.social");
        
        // Configure HTTP bearer authorization: bearer
        HttpBearerAuth bearer = (HttpBearerAuth) defaultClient.getAuthentication("bearer");
        bearer.setBearerToken("BEARER TOKEN");

        MediaApi apiInstance = new MediaApi(defaultClient);
        String workspaceId = "workspaceId_example"; // String | 
        String mediaId = "mediaId_example"; // String | 
        try {
            Media result = apiInstance.mediaGet(workspaceId, mediaId);
            System.out.println(result);
        } catch (ApiException e) {
            System.err.println("Exception when calling MediaApi#mediaGet");
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
| **mediaId** | **String**|  | |

### Return type

[**Media**](Media.md)


### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Media |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |
| **404** | The workspace has no media with this id. | No workspace with this id is open to the caller. |  -  |
| **503** | The server cannot reach its media store right now. Try again later. |  -  |

## mediaGetWithHttpInfo

> ApiResponse<Media> mediaGetWithHttpInfo(workspaceId, mediaId)

Get media

Shows one of the workspace&#39;s media. Needs media:read.

### Example

```java
// Import classes:
import social.peal.ApiClient;
import social.peal.ApiException;
import social.peal.ApiResponse;
import social.peal.Configuration;
import social.peal.auth.*;
import social.peal.models.*;
import social.peal.api.MediaApi;

public class Example {
    public static void main(String[] args) {
        ApiClient defaultClient = Configuration.getDefaultApiClient();
        defaultClient.setBasePath("https://app.peal.social");
        
        // Configure HTTP bearer authorization: bearer
        HttpBearerAuth bearer = (HttpBearerAuth) defaultClient.getAuthentication("bearer");
        bearer.setBearerToken("BEARER TOKEN");

        MediaApi apiInstance = new MediaApi(defaultClient);
        String workspaceId = "workspaceId_example"; // String | 
        String mediaId = "mediaId_example"; // String | 
        try {
            ApiResponse<Media> response = apiInstance.mediaGetWithHttpInfo(workspaceId, mediaId);
            System.out.println("Status code: " + response.getStatusCode());
            System.out.println("Response headers: " + response.getHeaders());
            System.out.println("Response body: " + response.getData());
        } catch (ApiException e) {
            System.err.println("Exception when calling MediaApi#mediaGet");
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
| **mediaId** | **String**|  | |

### Return type

ApiResponse<[**Media**](Media.md)>


### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Media |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |
| **404** | The workspace has no media with this id. | No workspace with this id is open to the caller. |  -  |
| **503** | The server cannot reach its media store right now. Try again later. |  -  |


## mediaList

> MediaPage mediaList(workspaceId, cursor, limit)

List media

Lists the workspace&#39;s media, newest first, 30 a page unless &#x60;limit&#x60; (at most 100) says otherwise. Pass the page&#39;s &#x60;nextCursor&#x60; as &#x60;cursor&#x60; for the next one. Needs media:read.

### Example

```java
// Import classes:
import social.peal.ApiClient;
import social.peal.ApiException;
import social.peal.Configuration;
import social.peal.auth.*;
import social.peal.models.*;
import social.peal.api.MediaApi;

public class Example {
    public static void main(String[] args) {
        ApiClient defaultClient = Configuration.getDefaultApiClient();
        defaultClient.setBasePath("https://app.peal.social");
        
        // Configure HTTP bearer authorization: bearer
        HttpBearerAuth bearer = (HttpBearerAuth) defaultClient.getAuthentication("bearer");
        bearer.setBearerToken("BEARER TOKEN");

        MediaApi apiInstance = new MediaApi(defaultClient);
        String workspaceId = "workspaceId_example"; // String | 
        String cursor = "cursor_example"; // String | 
        String limit = "limit_example"; // String | 
        try {
            MediaPage result = apiInstance.mediaList(workspaceId, cursor, limit);
            System.out.println(result);
        } catch (ApiException e) {
            System.err.println("Exception when calling MediaApi#mediaList");
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

[**MediaPage**](MediaPage.md)


### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | MediaPage |  -  |
| **400** | BadRequest |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |
| **404** | No workspace with this id is open to the caller. |  -  |
| **503** | The server cannot reach its media store right now. Try again later. |  -  |

## mediaListWithHttpInfo

> ApiResponse<MediaPage> mediaListWithHttpInfo(workspaceId, cursor, limit)

List media

Lists the workspace&#39;s media, newest first, 30 a page unless &#x60;limit&#x60; (at most 100) says otherwise. Pass the page&#39;s &#x60;nextCursor&#x60; as &#x60;cursor&#x60; for the next one. Needs media:read.

### Example

```java
// Import classes:
import social.peal.ApiClient;
import social.peal.ApiException;
import social.peal.ApiResponse;
import social.peal.Configuration;
import social.peal.auth.*;
import social.peal.models.*;
import social.peal.api.MediaApi;

public class Example {
    public static void main(String[] args) {
        ApiClient defaultClient = Configuration.getDefaultApiClient();
        defaultClient.setBasePath("https://app.peal.social");
        
        // Configure HTTP bearer authorization: bearer
        HttpBearerAuth bearer = (HttpBearerAuth) defaultClient.getAuthentication("bearer");
        bearer.setBearerToken("BEARER TOKEN");

        MediaApi apiInstance = new MediaApi(defaultClient);
        String workspaceId = "workspaceId_example"; // String | 
        String cursor = "cursor_example"; // String | 
        String limit = "limit_example"; // String | 
        try {
            ApiResponse<MediaPage> response = apiInstance.mediaListWithHttpInfo(workspaceId, cursor, limit);
            System.out.println("Status code: " + response.getStatusCode());
            System.out.println("Response headers: " + response.getHeaders());
            System.out.println("Response body: " + response.getData());
        } catch (ApiException e) {
            System.err.println("Exception when calling MediaApi#mediaList");
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

ApiResponse<[**MediaPage**](MediaPage.md)>


### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | MediaPage |  -  |
| **400** | BadRequest |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |
| **404** | No workspace with this id is open to the caller. |  -  |
| **503** | The server cannot reach its media store right now. Try again later. |  -  |


## mediaUsage

> MediaUsage mediaUsage(workspaceId, mediaId)

Get where media is used

Lists the posts that show the media: drafts, which lose it if it is deleted, and posts scheduled or publishing, which keep it from being deleted. Needs media:read.

### Example

```java
// Import classes:
import social.peal.ApiClient;
import social.peal.ApiException;
import social.peal.Configuration;
import social.peal.auth.*;
import social.peal.models.*;
import social.peal.api.MediaApi;

public class Example {
    public static void main(String[] args) {
        ApiClient defaultClient = Configuration.getDefaultApiClient();
        defaultClient.setBasePath("https://app.peal.social");
        
        // Configure HTTP bearer authorization: bearer
        HttpBearerAuth bearer = (HttpBearerAuth) defaultClient.getAuthentication("bearer");
        bearer.setBearerToken("BEARER TOKEN");

        MediaApi apiInstance = new MediaApi(defaultClient);
        String workspaceId = "workspaceId_example"; // String | 
        String mediaId = "mediaId_example"; // String | 
        try {
            MediaUsage result = apiInstance.mediaUsage(workspaceId, mediaId);
            System.out.println(result);
        } catch (ApiException e) {
            System.err.println("Exception when calling MediaApi#mediaUsage");
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
| **mediaId** | **String**|  | |

### Return type

[**MediaUsage**](MediaUsage.md)


### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | MediaUsage |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |
| **404** | The workspace has no media with this id. | No workspace with this id is open to the caller. |  -  |

## mediaUsageWithHttpInfo

> ApiResponse<MediaUsage> mediaUsageWithHttpInfo(workspaceId, mediaId)

Get where media is used

Lists the posts that show the media: drafts, which lose it if it is deleted, and posts scheduled or publishing, which keep it from being deleted. Needs media:read.

### Example

```java
// Import classes:
import social.peal.ApiClient;
import social.peal.ApiException;
import social.peal.ApiResponse;
import social.peal.Configuration;
import social.peal.auth.*;
import social.peal.models.*;
import social.peal.api.MediaApi;

public class Example {
    public static void main(String[] args) {
        ApiClient defaultClient = Configuration.getDefaultApiClient();
        defaultClient.setBasePath("https://app.peal.social");
        
        // Configure HTTP bearer authorization: bearer
        HttpBearerAuth bearer = (HttpBearerAuth) defaultClient.getAuthentication("bearer");
        bearer.setBearerToken("BEARER TOKEN");

        MediaApi apiInstance = new MediaApi(defaultClient);
        String workspaceId = "workspaceId_example"; // String | 
        String mediaId = "mediaId_example"; // String | 
        try {
            ApiResponse<MediaUsage> response = apiInstance.mediaUsageWithHttpInfo(workspaceId, mediaId);
            System.out.println("Status code: " + response.getStatusCode());
            System.out.println("Response headers: " + response.getHeaders());
            System.out.println("Response body: " + response.getData());
        } catch (ApiException e) {
            System.err.println("Exception when calling MediaApi#mediaUsage");
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
| **mediaId** | **String**|  | |

### Return type

ApiResponse<[**MediaUsage**](MediaUsage.md)>


### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | MediaUsage |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |
| **404** | The workspace has no media with this id. | No workspace with this id is open to the caller. |  -  |

