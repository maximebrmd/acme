# Peal::ApiKeysApi

All URIs are relative to *https://app.peal.social*

| Method | HTTP request | Description |
| ------ | ------------ | ----------- |
| [**api_keys_create**](ApiKeysApi.md#api_keys_create) | **POST** /api/workspaces/{workspaceId}/api-keys | Create an API key |
| [**api_keys_list**](ApiKeysApi.md#api_keys_list) | **GET** /api/workspaces/{workspaceId}/api-keys | List API keys |
| [**api_keys_revoke**](ApiKeysApi.md#api_keys_revoke) | **DELETE** /api/workspaces/{workspaceId}/api-keys/{apiKeyId} | Revoke an API key |


## api_keys_create

> <CreatedApiKey> api_keys_create(workspace_id, new_api_key)

Create an API key

Creates an API key for the workspace with some of the caller's permissions, and answers with the key itself, which is not shown again. Needs apiKey:create, and a signed-in member: API keys cannot create keys.

### Examples

```ruby
require 'time'
require 'peal'
# setup authorization
Peal.configure do |config|
  # Configure Bearer authorization: bearer
  config.access_token = 'YOUR_BEARER_TOKEN'
end

api_instance = Peal::ApiKeysApi.new
workspace_id = 'workspace_id_example' # String | 
new_api_key = Peal::NewApiKey.new({name: 'name_example', permissions: ['analytics:read']}) # NewApiKey | 

begin
  # Create an API key
  result = api_instance.api_keys_create(workspace_id, new_api_key)
  p result
rescue Peal::ApiError => e
  puts "Error when calling ApiKeysApi->api_keys_create: #{e}"
end
```

#### Using the api_keys_create_with_http_info variant

This returns an Array which contains the response data, status code and headers.

> <Array(<CreatedApiKey>, Integer, Hash)> api_keys_create_with_http_info(workspace_id, new_api_key)

```ruby
begin
  # Create an API key
  data, status_code, headers = api_instance.api_keys_create_with_http_info(workspace_id, new_api_key)
  p status_code # => 2xx
  p headers # => { ... }
  p data # => <CreatedApiKey>
rescue Peal::ApiError => e
  puts "Error when calling ApiKeysApi->api_keys_create_with_http_info: #{e}"
end
```

### Parameters

| Name | Type | Description | Notes |
| ---- | ---- | ----------- | ----- |
| **workspace_id** | **String** |  |  |
| **new_api_key** | [**NewApiKey**](NewApiKey.md) |  |  |

### Return type

[**CreatedApiKey**](CreatedApiKey.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json


## api_keys_list

> <Array<ApiKey>> api_keys_list(workspace_id)

List API keys

Lists the workspace's API keys. Needs apiKey:read.

### Examples

```ruby
require 'time'
require 'peal'
# setup authorization
Peal.configure do |config|
  # Configure Bearer authorization: bearer
  config.access_token = 'YOUR_BEARER_TOKEN'
end

api_instance = Peal::ApiKeysApi.new
workspace_id = 'workspace_id_example' # String | 

begin
  # List API keys
  result = api_instance.api_keys_list(workspace_id)
  p result
rescue Peal::ApiError => e
  puts "Error when calling ApiKeysApi->api_keys_list: #{e}"
end
```

#### Using the api_keys_list_with_http_info variant

This returns an Array which contains the response data, status code and headers.

> <Array(<Array<ApiKey>>, Integer, Hash)> api_keys_list_with_http_info(workspace_id)

```ruby
begin
  # List API keys
  data, status_code, headers = api_instance.api_keys_list_with_http_info(workspace_id)
  p status_code # => 2xx
  p headers # => { ... }
  p data # => <Array<ApiKey>>
rescue Peal::ApiError => e
  puts "Error when calling ApiKeysApi->api_keys_list_with_http_info: #{e}"
end
```

### Parameters

| Name | Type | Description | Notes |
| ---- | ---- | ----------- | ----- |
| **workspace_id** | **String** |  |  |

### Return type

[**Array&lt;ApiKey&gt;**](ApiKey.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json


## api_keys_revoke

> api_keys_revoke(workspace_id, api_key_id)

Revoke an API key

Revokes an API key of the workspace: it stops working at once. Needs apiKey:delete.

### Examples

```ruby
require 'time'
require 'peal'
# setup authorization
Peal.configure do |config|
  # Configure Bearer authorization: bearer
  config.access_token = 'YOUR_BEARER_TOKEN'
end

api_instance = Peal::ApiKeysApi.new
workspace_id = 'workspace_id_example' # String | 
api_key_id = 'api_key_id_example' # String | 

begin
  # Revoke an API key
  api_instance.api_keys_revoke(workspace_id, api_key_id)
rescue Peal::ApiError => e
  puts "Error when calling ApiKeysApi->api_keys_revoke: #{e}"
end
```

#### Using the api_keys_revoke_with_http_info variant

This returns an Array which contains the response data (`nil` in this case), status code and headers.

> <Array(nil, Integer, Hash)> api_keys_revoke_with_http_info(workspace_id, api_key_id)

```ruby
begin
  # Revoke an API key
  data, status_code, headers = api_instance.api_keys_revoke_with_http_info(workspace_id, api_key_id)
  p status_code # => 2xx
  p headers # => { ... }
  p data # => nil
rescue Peal::ApiError => e
  puts "Error when calling ApiKeysApi->api_keys_revoke_with_http_info: #{e}"
end
```

### Parameters

| Name | Type | Description | Notes |
| ---- | ---- | ----------- | ----- |
| **workspace_id** | **String** |  |  |
| **api_key_id** | **String** |  |  |

### Return type

nil (empty response body)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

