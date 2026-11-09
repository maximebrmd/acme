# Peal.Api.ApiKeysApi

All URIs are relative to *https://app.peal.social*

| Method | HTTP request | Description |
|--------|--------------|-------------|
| [**ApiKeysCreate**](ApiKeysApi.md#apikeyscreate) | **POST** /api/workspaces/{workspaceId}/api-keys | Create an API key |
| [**ApiKeysList**](ApiKeysApi.md#apikeyslist) | **GET** /api/workspaces/{workspaceId}/api-keys | List API keys |
| [**ApiKeysRevoke**](ApiKeysApi.md#apikeysrevoke) | **DELETE** /api/workspaces/{workspaceId}/api-keys/{apiKeyId} | Revoke an API key |

<a id="apikeyscreate"></a>
# **ApiKeysCreate**
> CreatedApiKey ApiKeysCreate (string workspaceId, NewApiKey newApiKey)

Create an API key

Creates an API key for the workspace with some of the caller's permissions, and answers with the key itself, which is not shown again. Needs apiKey:create, and a signed-in member: API keys cannot create keys.


### Parameters

| Name | Type | Description | Notes |
|------|------|-------------|-------|
| **workspaceId** | **string** |  |  |
| **newApiKey** | [**NewApiKey**](NewApiKey.md) |  |  |

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

[[Back to top]](#) [[Back to API list]](../../README.md#documentation-for-api-endpoints) [[Back to Model list]](../../README.md#documentation-for-models) [[Back to README]](../../README.md)

<a id="apikeyslist"></a>
# **ApiKeysList**
> List&lt;ApiKey&gt; ApiKeysList (string workspaceId)

List API keys

Lists the workspace's API keys. Needs apiKey:read.


### Parameters

| Name | Type | Description | Notes |
|------|------|-------------|-------|
| **workspaceId** | **string** |  |  |

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

[[Back to top]](#) [[Back to API list]](../../README.md#documentation-for-api-endpoints) [[Back to Model list]](../../README.md#documentation-for-models) [[Back to README]](../../README.md)

<a id="apikeysrevoke"></a>
# **ApiKeysRevoke**
> void ApiKeysRevoke (string workspaceId, string apiKeyId)

Revoke an API key

Revokes an API key of the workspace: it stops working at once. Needs apiKey:delete.


### Parameters

| Name | Type | Description | Notes |
|------|------|-------------|-------|
| **workspaceId** | **string** |  |  |
| **apiKeyId** | **string** |  |  |

### Return type

void (empty response body)

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

[[Back to top]](#) [[Back to API list]](../../README.md#documentation-for-api-endpoints) [[Back to Model list]](../../README.md#documentation-for-models) [[Back to README]](../../README.md)

