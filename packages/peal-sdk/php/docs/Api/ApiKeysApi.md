# Peal\ApiKeysApi



All URIs are relative to https://app.peal.social, except if the operation defines another base path.

| Method | HTTP request | Description |
| ------------- | ------------- | ------------- |
| [**apiKeysCreate()**](ApiKeysApi.md#apiKeysCreate) | **POST** /api/workspaces/{workspaceId}/api-keys | Create an API key |
| [**apiKeysList()**](ApiKeysApi.md#apiKeysList) | **GET** /api/workspaces/{workspaceId}/api-keys | List API keys |
| [**apiKeysRevoke()**](ApiKeysApi.md#apiKeysRevoke) | **DELETE** /api/workspaces/{workspaceId}/api-keys/{apiKeyId} | Revoke an API key |


## `apiKeysCreate()`

```php
apiKeysCreate($workspace_id, $new_api_key): \Peal\Model\CreatedApiKey
```

Create an API key

Creates an API key for the workspace with some of the caller's permissions, and answers with the key itself, which is not shown again. Needs apiKey:create, and a signed-in member: API keys cannot create keys.

### Example

```php
<?php
require_once(__DIR__ . '/vendor/autoload.php');


// Configure Bearer authorization: bearer
$config = Peal\Configuration::getDefaultConfiguration()->setAccessToken('YOUR_ACCESS_TOKEN');


$apiInstance = new Peal\Api\ApiKeysApi(
    // If you want use custom http client, pass your client which implements `GuzzleHttp\ClientInterface`.
    // This is optional, `GuzzleHttp\Client` will be used as default.
    new GuzzleHttp\Client(),
    $config
);
$workspace_id = 'workspace_id_example'; // string
$new_api_key = new \Peal\Model\NewApiKey(); // \Peal\Model\NewApiKey

try {
    $result = $apiInstance->apiKeysCreate($workspace_id, $new_api_key);
    print_r($result);
} catch (Exception $e) {
    echo 'Exception when calling ApiKeysApi->apiKeysCreate: ', $e->getMessage(), PHP_EOL;
}
```

### Parameters

| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **workspace_id** | **string**|  | |
| **new_api_key** | [**\Peal\Model\NewApiKey**](../Model/NewApiKey.md)|  | |

### Return type

[**\Peal\Model\CreatedApiKey**](../Model/CreatedApiKey.md)

### Authorization

[bearer](../../README.md#bearer)

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`

[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to Model list]](../../README.md#models)
[[Back to README]](../../README.md)

## `apiKeysList()`

```php
apiKeysList($workspace_id): \Peal\Model\ApiKey[]
```

List API keys

Lists the workspace's API keys. Needs apiKey:read.

### Example

```php
<?php
require_once(__DIR__ . '/vendor/autoload.php');


// Configure Bearer authorization: bearer
$config = Peal\Configuration::getDefaultConfiguration()->setAccessToken('YOUR_ACCESS_TOKEN');


$apiInstance = new Peal\Api\ApiKeysApi(
    // If you want use custom http client, pass your client which implements `GuzzleHttp\ClientInterface`.
    // This is optional, `GuzzleHttp\Client` will be used as default.
    new GuzzleHttp\Client(),
    $config
);
$workspace_id = 'workspace_id_example'; // string

try {
    $result = $apiInstance->apiKeysList($workspace_id);
    print_r($result);
} catch (Exception $e) {
    echo 'Exception when calling ApiKeysApi->apiKeysList: ', $e->getMessage(), PHP_EOL;
}
```

### Parameters

| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **workspace_id** | **string**|  | |

### Return type

[**\Peal\Model\ApiKey[]**](../Model/ApiKey.md)

### Authorization

[bearer](../../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`

[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to Model list]](../../README.md#models)
[[Back to README]](../../README.md)

## `apiKeysRevoke()`

```php
apiKeysRevoke($workspace_id, $api_key_id)
```

Revoke an API key

Revokes an API key of the workspace: it stops working at once. Needs apiKey:delete.

### Example

```php
<?php
require_once(__DIR__ . '/vendor/autoload.php');


// Configure Bearer authorization: bearer
$config = Peal\Configuration::getDefaultConfiguration()->setAccessToken('YOUR_ACCESS_TOKEN');


$apiInstance = new Peal\Api\ApiKeysApi(
    // If you want use custom http client, pass your client which implements `GuzzleHttp\ClientInterface`.
    // This is optional, `GuzzleHttp\Client` will be used as default.
    new GuzzleHttp\Client(),
    $config
);
$workspace_id = 'workspace_id_example'; // string
$api_key_id = 'api_key_id_example'; // string

try {
    $apiInstance->apiKeysRevoke($workspace_id, $api_key_id);
} catch (Exception $e) {
    echo 'Exception when calling ApiKeysApi->apiKeysRevoke: ', $e->getMessage(), PHP_EOL;
}
```

### Parameters

| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **workspace_id** | **string**|  | |
| **api_key_id** | **string**|  | |

### Return type

void (empty response body)

### Authorization

[bearer](../../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`

[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to Model list]](../../README.md#models)
[[Back to README]](../../README.md)
