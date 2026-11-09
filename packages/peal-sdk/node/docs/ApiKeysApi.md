# ApiKeysApi

All URIs are relative to *https://app.peal.social*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**apiKeysCreate**](ApiKeysApi.md#apikeyscreate) | **POST** /api/workspaces/{workspaceId}/api-keys | Create an API key |
| [**apiKeysList**](ApiKeysApi.md#apikeyslist) | **GET** /api/workspaces/{workspaceId}/api-keys | List API keys |
| [**apiKeysRevoke**](ApiKeysApi.md#apikeysrevoke) | **DELETE** /api/workspaces/{workspaceId}/api-keys/{apiKeyId} | Revoke an API key |



## apiKeysCreate

> CreatedApiKey apiKeysCreate(workspaceId, newApiKey)

Create an API key

Creates an API key for the workspace with some of the caller\&#39;s permissions, and answers with the key itself, which is not shown again. Needs apiKey:create, and a signed-in member: API keys cannot create keys.

### Example

```ts
import {
  Configuration,
  ApiKeysApi,
} from 'peal-sdk';
import type { ApiKeysCreateRequest } from 'peal-sdk';

async function example() {
  console.log("🚀 Testing peal-sdk SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new ApiKeysApi(config);

  const body = {
    // string
    workspaceId: workspaceId_example,
    // NewApiKey
    newApiKey: ...,
  } satisfies ApiKeysCreateRequest;

  try {
    const data = await api.apiKeysCreate(body);
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
| **workspaceId** | `string` |  | [Defaults to `undefined`] |
| **newApiKey** | [NewApiKey](NewApiKey.md) |  | |

### Return type

[**CreatedApiKey**](CreatedApiKey.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **201** | CreatedApiKey |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |
| **404** | No workspace with this id is open to the caller. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## apiKeysList

> Array&lt;ApiKey&gt; apiKeysList(workspaceId)

List API keys

Lists the workspace\&#39;s API keys. Needs apiKey:read.

### Example

```ts
import {
  Configuration,
  ApiKeysApi,
} from 'peal-sdk';
import type { ApiKeysListRequest } from 'peal-sdk';

async function example() {
  console.log("🚀 Testing peal-sdk SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new ApiKeysApi(config);

  const body = {
    // string
    workspaceId: workspaceId_example,
  } satisfies ApiKeysListRequest;

  try {
    const data = await api.apiKeysList(body);
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
| **workspaceId** | `string` |  | [Defaults to `undefined`] |

### Return type

[**Array&lt;ApiKey&gt;**](ApiKey.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Success |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |
| **404** | No workspace with this id is open to the caller. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## apiKeysRevoke

> apiKeysRevoke(workspaceId, apiKeyId)

Revoke an API key

Revokes an API key of the workspace: it stops working at once. Needs apiKey:delete.

### Example

```ts
import {
  Configuration,
  ApiKeysApi,
} from 'peal-sdk';
import type { ApiKeysRevokeRequest } from 'peal-sdk';

async function example() {
  console.log("🚀 Testing peal-sdk SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new ApiKeysApi(config);

  const body = {
    // string
    workspaceId: workspaceId_example,
    // string
    apiKeyId: apiKeyId_example,
  } satisfies ApiKeysRevokeRequest;

  try {
    const data = await api.apiKeysRevoke(body);
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
| **workspaceId** | `string` |  | [Defaults to `undefined`] |
| **apiKeyId** | `string` |  | [Defaults to `undefined`] |

### Return type

`void` (Empty response body)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **204** | &lt;No Content&gt; |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |
| **404** | The workspace has no API key with this id. | No workspace with this id is open to the caller. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

