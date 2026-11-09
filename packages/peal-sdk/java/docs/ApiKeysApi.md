# ApiKeysApi

All URIs are relative to *https://app.peal.social*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**apiKeysCreate**](ApiKeysApi.md#apiKeysCreate) | **POST** /api/workspaces/{workspaceId}/api-keys | Create an API key |
| [**apiKeysCreateWithHttpInfo**](ApiKeysApi.md#apiKeysCreateWithHttpInfo) | **POST** /api/workspaces/{workspaceId}/api-keys | Create an API key |
| [**apiKeysList**](ApiKeysApi.md#apiKeysList) | **GET** /api/workspaces/{workspaceId}/api-keys | List API keys |
| [**apiKeysListWithHttpInfo**](ApiKeysApi.md#apiKeysListWithHttpInfo) | **GET** /api/workspaces/{workspaceId}/api-keys | List API keys |
| [**apiKeysRevoke**](ApiKeysApi.md#apiKeysRevoke) | **DELETE** /api/workspaces/{workspaceId}/api-keys/{apiKeyId} | Revoke an API key |
| [**apiKeysRevokeWithHttpInfo**](ApiKeysApi.md#apiKeysRevokeWithHttpInfo) | **DELETE** /api/workspaces/{workspaceId}/api-keys/{apiKeyId} | Revoke an API key |



## apiKeysCreate

> CreatedApiKey apiKeysCreate(workspaceId, newApiKey)

Create an API key

Creates an API key for the workspace with some of the caller&#39;s permissions, and answers with the key itself, which is not shown again. Needs apiKey:create, and a signed-in member: API keys cannot create keys.

### Example

```java
// Import classes:
import social.peal.ApiClient;
import social.peal.ApiException;
import social.peal.Configuration;
import social.peal.auth.*;
import social.peal.models.*;
import social.peal.api.ApiKeysApi;

public class Example {
    public static void main(String[] args) {
        ApiClient defaultClient = Configuration.getDefaultApiClient();
        defaultClient.setBasePath("https://app.peal.social");
        
        // Configure HTTP bearer authorization: bearer
        HttpBearerAuth bearer = (HttpBearerAuth) defaultClient.getAuthentication("bearer");
        bearer.setBearerToken("BEARER TOKEN");

        ApiKeysApi apiInstance = new ApiKeysApi(defaultClient);
        String workspaceId = "workspaceId_example"; // String | 
        NewApiKey newApiKey = new NewApiKey(); // NewApiKey | 
        try {
            CreatedApiKey result = apiInstance.apiKeysCreate(workspaceId, newApiKey);
            System.out.println(result);
        } catch (ApiException e) {
            System.err.println("Exception when calling ApiKeysApi#apiKeysCreate");
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
| **newApiKey** | [**NewApiKey**](NewApiKey.md)|  | |

### Return type

[**CreatedApiKey**](CreatedApiKey.md)


### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **201** | CreatedApiKey |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |
| **404** | No workspace with this id is open to the caller. |  -  |

## apiKeysCreateWithHttpInfo

> ApiResponse<CreatedApiKey> apiKeysCreateWithHttpInfo(workspaceId, newApiKey)

Create an API key

Creates an API key for the workspace with some of the caller&#39;s permissions, and answers with the key itself, which is not shown again. Needs apiKey:create, and a signed-in member: API keys cannot create keys.

### Example

```java
// Import classes:
import social.peal.ApiClient;
import social.peal.ApiException;
import social.peal.ApiResponse;
import social.peal.Configuration;
import social.peal.auth.*;
import social.peal.models.*;
import social.peal.api.ApiKeysApi;

public class Example {
    public static void main(String[] args) {
        ApiClient defaultClient = Configuration.getDefaultApiClient();
        defaultClient.setBasePath("https://app.peal.social");
        
        // Configure HTTP bearer authorization: bearer
        HttpBearerAuth bearer = (HttpBearerAuth) defaultClient.getAuthentication("bearer");
        bearer.setBearerToken("BEARER TOKEN");

        ApiKeysApi apiInstance = new ApiKeysApi(defaultClient);
        String workspaceId = "workspaceId_example"; // String | 
        NewApiKey newApiKey = new NewApiKey(); // NewApiKey | 
        try {
            ApiResponse<CreatedApiKey> response = apiInstance.apiKeysCreateWithHttpInfo(workspaceId, newApiKey);
            System.out.println("Status code: " + response.getStatusCode());
            System.out.println("Response headers: " + response.getHeaders());
            System.out.println("Response body: " + response.getData());
        } catch (ApiException e) {
            System.err.println("Exception when calling ApiKeysApi#apiKeysCreate");
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
| **newApiKey** | [**NewApiKey**](NewApiKey.md)|  | |

### Return type

ApiResponse<[**CreatedApiKey**](CreatedApiKey.md)>


### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **201** | CreatedApiKey |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |
| **404** | No workspace with this id is open to the caller. |  -  |


## apiKeysList

> List<ApiKey> apiKeysList(workspaceId)

List API keys

Lists the workspace&#39;s API keys. Needs apiKey:read.

### Example

```java
// Import classes:
import social.peal.ApiClient;
import social.peal.ApiException;
import social.peal.Configuration;
import social.peal.auth.*;
import social.peal.models.*;
import social.peal.api.ApiKeysApi;

public class Example {
    public static void main(String[] args) {
        ApiClient defaultClient = Configuration.getDefaultApiClient();
        defaultClient.setBasePath("https://app.peal.social");
        
        // Configure HTTP bearer authorization: bearer
        HttpBearerAuth bearer = (HttpBearerAuth) defaultClient.getAuthentication("bearer");
        bearer.setBearerToken("BEARER TOKEN");

        ApiKeysApi apiInstance = new ApiKeysApi(defaultClient);
        String workspaceId = "workspaceId_example"; // String | 
        try {
            List<ApiKey> result = apiInstance.apiKeysList(workspaceId);
            System.out.println(result);
        } catch (ApiException e) {
            System.err.println("Exception when calling ApiKeysApi#apiKeysList");
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

[**List&lt;ApiKey&gt;**](ApiKey.md)


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

## apiKeysListWithHttpInfo

> ApiResponse<List<ApiKey>> apiKeysListWithHttpInfo(workspaceId)

List API keys

Lists the workspace&#39;s API keys. Needs apiKey:read.

### Example

```java
// Import classes:
import social.peal.ApiClient;
import social.peal.ApiException;
import social.peal.ApiResponse;
import social.peal.Configuration;
import social.peal.auth.*;
import social.peal.models.*;
import social.peal.api.ApiKeysApi;

public class Example {
    public static void main(String[] args) {
        ApiClient defaultClient = Configuration.getDefaultApiClient();
        defaultClient.setBasePath("https://app.peal.social");
        
        // Configure HTTP bearer authorization: bearer
        HttpBearerAuth bearer = (HttpBearerAuth) defaultClient.getAuthentication("bearer");
        bearer.setBearerToken("BEARER TOKEN");

        ApiKeysApi apiInstance = new ApiKeysApi(defaultClient);
        String workspaceId = "workspaceId_example"; // String | 
        try {
            ApiResponse<List<ApiKey>> response = apiInstance.apiKeysListWithHttpInfo(workspaceId);
            System.out.println("Status code: " + response.getStatusCode());
            System.out.println("Response headers: " + response.getHeaders());
            System.out.println("Response body: " + response.getData());
        } catch (ApiException e) {
            System.err.println("Exception when calling ApiKeysApi#apiKeysList");
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

### Return type

ApiResponse<[**List&lt;ApiKey&gt;**](ApiKey.md)>


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


## apiKeysRevoke

> void apiKeysRevoke(workspaceId, apiKeyId)

Revoke an API key

Revokes an API key of the workspace: it stops working at once. Needs apiKey:delete.

### Example

```java
// Import classes:
import social.peal.ApiClient;
import social.peal.ApiException;
import social.peal.Configuration;
import social.peal.auth.*;
import social.peal.models.*;
import social.peal.api.ApiKeysApi;

public class Example {
    public static void main(String[] args) {
        ApiClient defaultClient = Configuration.getDefaultApiClient();
        defaultClient.setBasePath("https://app.peal.social");
        
        // Configure HTTP bearer authorization: bearer
        HttpBearerAuth bearer = (HttpBearerAuth) defaultClient.getAuthentication("bearer");
        bearer.setBearerToken("BEARER TOKEN");

        ApiKeysApi apiInstance = new ApiKeysApi(defaultClient);
        String workspaceId = "workspaceId_example"; // String | 
        String apiKeyId = "apiKeyId_example"; // String | 
        try {
            apiInstance.apiKeysRevoke(workspaceId, apiKeyId);
        } catch (ApiException e) {
            System.err.println("Exception when calling ApiKeysApi#apiKeysRevoke");
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
| **apiKeyId** | **String**|  | |

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
| **404** | The workspace has no API key with this id. | No workspace with this id is open to the caller. |  -  |

## apiKeysRevokeWithHttpInfo

> ApiResponse<Void> apiKeysRevokeWithHttpInfo(workspaceId, apiKeyId)

Revoke an API key

Revokes an API key of the workspace: it stops working at once. Needs apiKey:delete.

### Example

```java
// Import classes:
import social.peal.ApiClient;
import social.peal.ApiException;
import social.peal.ApiResponse;
import social.peal.Configuration;
import social.peal.auth.*;
import social.peal.models.*;
import social.peal.api.ApiKeysApi;

public class Example {
    public static void main(String[] args) {
        ApiClient defaultClient = Configuration.getDefaultApiClient();
        defaultClient.setBasePath("https://app.peal.social");
        
        // Configure HTTP bearer authorization: bearer
        HttpBearerAuth bearer = (HttpBearerAuth) defaultClient.getAuthentication("bearer");
        bearer.setBearerToken("BEARER TOKEN");

        ApiKeysApi apiInstance = new ApiKeysApi(defaultClient);
        String workspaceId = "workspaceId_example"; // String | 
        String apiKeyId = "apiKeyId_example"; // String | 
        try {
            ApiResponse<Void> response = apiInstance.apiKeysRevokeWithHttpInfo(workspaceId, apiKeyId);
            System.out.println("Status code: " + response.getStatusCode());
            System.out.println("Response headers: " + response.getHeaders());
        } catch (ApiException e) {
            System.err.println("Exception when calling ApiKeysApi#apiKeysRevoke");
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
| **apiKeyId** | **String**|  | |

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
| **404** | The workspace has no API key with this id. | No workspace with this id is open to the caller. |  -  |

