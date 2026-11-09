# Peal\TiktokApi



All URIs are relative to https://app.peal.social, except if the operation defines another base path.

| Method | HTTP request | Description |
| ------------- | ------------- | ------------- |
| [**tiktokCreator()**](TiktokApi.md#tiktokCreator) | **GET** /api/workspaces/{workspaceId}/channels/{channelId}/tiktok-creator | Read a TikTok channel&#39;s creator |


## `tiktokCreator()`

```php
tiktokCreator($channel_id, $workspace_id): \Peal\Model\TikTokAccount
```

Read a TikTok channel's creator

Reads a TikTok channel's creator from TikTok: their nickname, the audiences the account offers, the interactions they turned off and the longest video they may post, or why they cannot post now. A channel that is not TikTok's is ChannelNotFound. Needs post:create.

### Example

```php
<?php
require_once(__DIR__ . '/vendor/autoload.php');


// Configure Bearer authorization: bearer
$config = Peal\Configuration::getDefaultConfiguration()->setAccessToken('YOUR_ACCESS_TOKEN');


$apiInstance = new Peal\Api\TiktokApi(
    // If you want use custom http client, pass your client which implements `GuzzleHttp\ClientInterface`.
    // This is optional, `GuzzleHttp\Client` will be used as default.
    new GuzzleHttp\Client(),
    $config
);
$channel_id = 'channel_id_example'; // string
$workspace_id = 'workspace_id_example'; // string

try {
    $result = $apiInstance->tiktokCreator($channel_id, $workspace_id);
    print_r($result);
} catch (Exception $e) {
    echo 'Exception when calling TiktokApi->tiktokCreator: ', $e->getMessage(), PHP_EOL;
}
```

### Parameters

| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **channel_id** | **string**|  | |
| **workspace_id** | **string**|  | |

### Return type

[**\Peal\Model\TikTokAccount**](../Model/TikTokAccount.md)

### Authorization

[bearer](../../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`

[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to Model list]](../../README.md#models)
[[Back to README]](../../README.md)
