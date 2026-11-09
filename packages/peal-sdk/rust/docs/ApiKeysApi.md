# \ApiKeysApi

All URIs are relative to *https://app.peal.social*

Method | HTTP request | Description
------------- | ------------- | -------------
[**api_keys_create**](ApiKeysApi.md#api_keys_create) | **POST** /api/workspaces/{workspaceId}/api-keys | Create an API key
[**api_keys_list**](ApiKeysApi.md#api_keys_list) | **GET** /api/workspaces/{workspaceId}/api-keys | List API keys
[**api_keys_revoke**](ApiKeysApi.md#api_keys_revoke) | **DELETE** /api/workspaces/{workspaceId}/api-keys/{apiKeyId} | Revoke an API key



## api_keys_create

> models::CreatedApiKey api_keys_create(workspace_id, new_api_key)
Create an API key

Creates an API key for the workspace with some of the caller's permissions, and answers with the key itself, which is not shown again. Needs apiKey:create, and a signed-in member: API keys cannot create keys.

### Parameters


Name | Type | Description  | Required | Notes
------------- | ------------- | ------------- | ------------- | -------------
**workspace_id** | **String** |  | [required] |
**new_api_key** | [**NewApiKey**](NewApiKey.md) |  | [required] |

### Return type

[**models::CreatedApiKey**](CreatedApiKey.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)


## api_keys_list

> Vec<models::ApiKey> api_keys_list(workspace_id)
List API keys

Lists the workspace's API keys. Needs apiKey:read.

### Parameters


Name | Type | Description  | Required | Notes
------------- | ------------- | ------------- | ------------- | -------------
**workspace_id** | **String** |  | [required] |

### Return type

[**Vec<models::ApiKey>**](ApiKey.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)


## api_keys_revoke

> api_keys_revoke(workspace_id, api_key_id)
Revoke an API key

Revokes an API key of the workspace: it stops working at once. Needs apiKey:delete.

### Parameters


Name | Type | Description  | Required | Notes
------------- | ------------- | ------------- | ------------- | -------------
**workspace_id** | **String** |  | [required] |
**api_key_id** | **String** |  | [required] |

### Return type

 (empty response body)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

