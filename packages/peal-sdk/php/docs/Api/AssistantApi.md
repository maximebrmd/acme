# Peal\AssistantApi



All URIs are relative to https://app.peal.social, except if the operation defines another base path.

| Method | HTTP request | Description |
| ------------- | ------------- | ------------- |
| [**assistantStatus()**](AssistantApi.md#assistantStatus) | **GET** /api/workspaces/{workspaceId}/assistant | Get the assistant&#39;s status |
| [**assistantSuggest()**](AssistantApi.md#assistantSuggest) | **POST** /api/workspaces/{workspaceId}/assistant/suggestions | Suggest a change to a post&#39;s text |


## `assistantStatus()`

```php
assistantStatus($workspace_id): \Peal\Model\AssistantStatus
```

Get the assistant's status

Tells whether the server has a language model, so clients show the assistant or hide it, and how many requests the workspace has left today. Needs assistant:use.

### Example

```php
<?php
require_once(__DIR__ . '/vendor/autoload.php');


// Configure Bearer authorization: bearer
$config = Peal\Configuration::getDefaultConfiguration()->setAccessToken('YOUR_ACCESS_TOKEN');


$apiInstance = new Peal\Api\AssistantApi(
    // If you want use custom http client, pass your client which implements `GuzzleHttp\ClientInterface`.
    // This is optional, `GuzzleHttp\Client` will be used as default.
    new GuzzleHttp\Client(),
    $config
);
$workspace_id = 'workspace_id_example'; // string

try {
    $result = $apiInstance->assistantStatus($workspace_id);
    print_r($result);
} catch (Exception $e) {
    echo 'Exception when calling AssistantApi->assistantStatus: ', $e->getMessage(), PHP_EOL;
}
```

### Parameters

| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **workspace_id** | **string**|  | |

### Return type

[**\Peal\Model\AssistantStatus**](../Model/AssistantStatus.md)

### Authorization

[bearer](../../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`

[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to Model list]](../../README.md#models)
[[Back to README]](../../README.md)

## `assistantSuggest()`

```php
assistantSuggest($workspace_id, $suggestion_request): \Peal\Model\Suggestion
```

Suggest a change to a post's text

Asks the language model to rewrite, shorten or translate a post's text, or to suggest hashtags for it, and answers once the whole suggestion is checked. The text is sent to the model as data, never as instructions. Each request counts toward the workspace's daily quota, unless the model's provider could not be reached. Needs assistant:use.

### Example

```php
<?php
require_once(__DIR__ . '/vendor/autoload.php');


// Configure Bearer authorization: bearer
$config = Peal\Configuration::getDefaultConfiguration()->setAccessToken('YOUR_ACCESS_TOKEN');


$apiInstance = new Peal\Api\AssistantApi(
    // If you want use custom http client, pass your client which implements `GuzzleHttp\ClientInterface`.
    // This is optional, `GuzzleHttp\Client` will be used as default.
    new GuzzleHttp\Client(),
    $config
);
$workspace_id = 'workspace_id_example'; // string
$suggestion_request = new \Peal\Model\SuggestionRequest(); // \Peal\Model\SuggestionRequest

try {
    $result = $apiInstance->assistantSuggest($workspace_id, $suggestion_request);
    print_r($result);
} catch (Exception $e) {
    echo 'Exception when calling AssistantApi->assistantSuggest: ', $e->getMessage(), PHP_EOL;
}
```

### Parameters

| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **workspace_id** | **string**|  | |
| **suggestion_request** | [**\Peal\Model\SuggestionRequest**](../Model/SuggestionRequest.md)|  | |

### Return type

[**\Peal\Model\Suggestion**](../Model/Suggestion.md)

### Authorization

[bearer](../../README.md#bearer)

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`

[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to Model list]](../../README.md#models)
[[Back to README]](../../README.md)
