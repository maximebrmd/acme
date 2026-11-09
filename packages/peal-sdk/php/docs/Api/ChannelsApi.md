# Peal\ChannelsApi



All URIs are relative to https://app.peal.social, except if the operation defines another base path.

| Method | HTTP request | Description |
| ------------- | ------------- | ------------- |
| [**channelsChooseAccounts()**](ChannelsApi.md#channelsChooseAccounts) | **POST** /api/workspaces/{workspaceId}/channels/connect/{platform}/accounts | Choose the accounts to connect |
| [**channelsCompleteConnect()**](ChannelsApi.md#channelsCompleteConnect) | **POST** /api/workspaces/{workspaceId}/channels/connect/{platform}/callback | Complete connecting an account |
| [**channelsConnect()**](ChannelsApi.md#channelsConnect) | **POST** /api/workspaces/{workspaceId}/channels/connect/{platform} | Start connecting an account |
| [**channelsDisconnect()**](ChannelsApi.md#channelsDisconnect) | **DELETE** /api/workspaces/{workspaceId}/channels/{channelId} | Disconnect a channel |
| [**channelsList()**](ChannelsApi.md#channelsList) | **GET** /api/workspaces/{workspaceId}/channels | List channels |
| [**channelsPlatforms()**](ChannelsApi.md#channelsPlatforms) | **GET** /api/workspaces/{workspaceId}/channels/platforms | List connectable platforms |
| [**channelsReconnect()**](ChannelsApi.md#channelsReconnect) | **POST** /api/workspaces/{workspaceId}/channels/{channelId}/reconnect | Start reconnecting a channel |


## `channelsChooseAccounts()`

```php
channelsChooseAccounts($workspace_id, $platform, $choose_accounts): \Peal\Model\Channel[]
```

Choose the accounts to connect

Connects the accounts the member chose among those a completed sign-in listed: each becomes a channel of the workspace, or reconnects the one it has. The new accounts chosen need room in the workspace's plan, all of them: otherwise none is connected (PlanLimitReached), and the choice can be made again with fewer. Only the member who completed the sign-in can choose, within 15 minutes, and once an account is connected: a choice that failed before connecting any can be made again. Needs channel:connect.

### Example

```php
<?php
require_once(__DIR__ . '/vendor/autoload.php');


// Configure Bearer authorization: bearer
$config = Peal\Configuration::getDefaultConfiguration()->setAccessToken('YOUR_ACCESS_TOKEN');


$apiInstance = new Peal\Api\ChannelsApi(
    // If you want use custom http client, pass your client which implements `GuzzleHttp\ClientInterface`.
    // This is optional, `GuzzleHttp\Client` will be used as default.
    new GuzzleHttp\Client(),
    $config
);
$workspace_id = 'workspace_id_example'; // string
$platform = new \Peal\Model\\Peal\Model\Platform(); // \Peal\Model\Platform
$choose_accounts = new \Peal\Model\ChooseAccounts(); // \Peal\Model\ChooseAccounts

try {
    $result = $apiInstance->channelsChooseAccounts($workspace_id, $platform, $choose_accounts);
    print_r($result);
} catch (Exception $e) {
    echo 'Exception when calling ChannelsApi->channelsChooseAccounts: ', $e->getMessage(), PHP_EOL;
}
```

### Parameters

| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **workspace_id** | **string**|  | |
| **platform** | [**\Peal\Model\Platform**](../Model/.md)|  | |
| **choose_accounts** | [**\Peal\Model\ChooseAccounts**](../Model/ChooseAccounts.md)|  | |

### Return type

[**\Peal\Model\Channel[]**](../Model/Channel.md)

### Authorization

[bearer](../../README.md#bearer)

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`

[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to Model list]](../../README.md#models)
[[Back to README]](../../README.md)

## `channelsCompleteConnect()`

```php
channelsCompleteConnect($workspace_id, $platform, $connect_callback): \Peal\Model\ConnectOutcome
```

Complete connecting an account

Completes a connection with what the platform sent back: the account becomes a channel of the workspace, or the channel it reconnects takes its new tokens. When the sign-in reached several accounts, as the Pages a Facebook user manages, the answer lists them instead, to choose with chooseAccounts. Only the member who started the connection can complete it, once. A new account needs room in the workspace's plan (PlanLimitReached). Needs channel:connect.

### Example

```php
<?php
require_once(__DIR__ . '/vendor/autoload.php');


// Configure Bearer authorization: bearer
$config = Peal\Configuration::getDefaultConfiguration()->setAccessToken('YOUR_ACCESS_TOKEN');


$apiInstance = new Peal\Api\ChannelsApi(
    // If you want use custom http client, pass your client which implements `GuzzleHttp\ClientInterface`.
    // This is optional, `GuzzleHttp\Client` will be used as default.
    new GuzzleHttp\Client(),
    $config
);
$workspace_id = 'workspace_id_example'; // string
$platform = new \Peal\Model\\Peal\Model\Platform(); // \Peal\Model\Platform
$connect_callback = new \Peal\Model\ConnectCallback(); // \Peal\Model\ConnectCallback

try {
    $result = $apiInstance->channelsCompleteConnect($workspace_id, $platform, $connect_callback);
    print_r($result);
} catch (Exception $e) {
    echo 'Exception when calling ChannelsApi->channelsCompleteConnect: ', $e->getMessage(), PHP_EOL;
}
```

### Parameters

| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **workspace_id** | **string**|  | |
| **platform** | [**\Peal\Model\Platform**](../Model/.md)|  | |
| **connect_callback** | [**\Peal\Model\ConnectCallback**](../Model/ConnectCallback.md)|  | |

### Return type

[**\Peal\Model\ConnectOutcome**](../Model/ConnectOutcome.md)

### Authorization

[bearer](../../README.md#bearer)

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`

[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to Model list]](../../README.md#models)
[[Back to README]](../../README.md)

## `channelsConnect()`

```php
channelsConnect($workspace_id, $platform, $connect_channel): \Peal\Model\Authorization
```

Start connecting an account

Starts connecting an account of the platform: answers with the platform's sign-in page, where the browser goes next. For Instagram, `connection` picks Instagram Login (the professional account itself, no Facebook Page needed) or Facebook Login (the accounts linked to the caller's Pages); without it, the server's preferred way. The connection is tied to the caller and the workspace, and must be completed within 15 minutes. On a server that bills, a workspace whose plan allows no more channels gets PlanLimitReached. Needs channel:connect.

### Example

```php
<?php
require_once(__DIR__ . '/vendor/autoload.php');


// Configure Bearer authorization: bearer
$config = Peal\Configuration::getDefaultConfiguration()->setAccessToken('YOUR_ACCESS_TOKEN');


$apiInstance = new Peal\Api\ChannelsApi(
    // If you want use custom http client, pass your client which implements `GuzzleHttp\ClientInterface`.
    // This is optional, `GuzzleHttp\Client` will be used as default.
    new GuzzleHttp\Client(),
    $config
);
$workspace_id = 'workspace_id_example'; // string
$platform = new \Peal\Model\\Peal\Model\Platform(); // \Peal\Model\Platform
$connect_channel = new \Peal\Model\ConnectChannel(); // \Peal\Model\ConnectChannel

try {
    $result = $apiInstance->channelsConnect($workspace_id, $platform, $connect_channel);
    print_r($result);
} catch (Exception $e) {
    echo 'Exception when calling ChannelsApi->channelsConnect: ', $e->getMessage(), PHP_EOL;
}
```

### Parameters

| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **workspace_id** | **string**|  | |
| **platform** | [**\Peal\Model\Platform**](../Model/.md)|  | |
| **connect_channel** | [**\Peal\Model\ConnectChannel**](../Model/ConnectChannel.md)|  | |

### Return type

[**\Peal\Model\Authorization**](../Model/Authorization.md)

### Authorization

[bearer](../../README.md#bearer)

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`

[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to Model list]](../../README.md#models)
[[Back to README]](../../README.md)

## `channelsDisconnect()`

```php
channelsDisconnect($workspace_id, $channel_id)
```

Disconnect a channel

Disconnects a channel from the workspace: the channel and the tokens Peal holds for it are deleted, and nothing more is posted on it. Needs channel:disconnect.

### Example

```php
<?php
require_once(__DIR__ . '/vendor/autoload.php');


// Configure Bearer authorization: bearer
$config = Peal\Configuration::getDefaultConfiguration()->setAccessToken('YOUR_ACCESS_TOKEN');


$apiInstance = new Peal\Api\ChannelsApi(
    // If you want use custom http client, pass your client which implements `GuzzleHttp\ClientInterface`.
    // This is optional, `GuzzleHttp\Client` will be used as default.
    new GuzzleHttp\Client(),
    $config
);
$workspace_id = 'workspace_id_example'; // string
$channel_id = 'channel_id_example'; // string

try {
    $apiInstance->channelsDisconnect($workspace_id, $channel_id);
} catch (Exception $e) {
    echo 'Exception when calling ChannelsApi->channelsDisconnect: ', $e->getMessage(), PHP_EOL;
}
```

### Parameters

| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **workspace_id** | **string**|  | |
| **channel_id** | **string**|  | |

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

## `channelsList()`

```php
channelsList($workspace_id): \Peal\Model\Channel[]
```

List channels

Lists the channels connected to the workspace, oldest first. Their tokens are never shown. Needs channel:read.

### Example

```php
<?php
require_once(__DIR__ . '/vendor/autoload.php');


// Configure Bearer authorization: bearer
$config = Peal\Configuration::getDefaultConfiguration()->setAccessToken('YOUR_ACCESS_TOKEN');


$apiInstance = new Peal\Api\ChannelsApi(
    // If you want use custom http client, pass your client which implements `GuzzleHttp\ClientInterface`.
    // This is optional, `GuzzleHttp\Client` will be used as default.
    new GuzzleHttp\Client(),
    $config
);
$workspace_id = 'workspace_id_example'; // string

try {
    $result = $apiInstance->channelsList($workspace_id);
    print_r($result);
} catch (Exception $e) {
    echo 'Exception when calling ChannelsApi->channelsList: ', $e->getMessage(), PHP_EOL;
}
```

### Parameters

| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **workspace_id** | **string**|  | |

### Return type

[**\Peal\Model\Channel[]**](../Model/Channel.md)

### Authorization

[bearer](../../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`

[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to Model list]](../../README.md#models)
[[Back to README]](../../README.md)

## `channelsPlatforms()`

```php
channelsPlatforms($workspace_id): \Peal\Model\ConnectablePlatforms
```

List connectable platforms

Lists the platforms this server can connect accounts of, in Peal's order. A platform that needs a setting the server lacks, such as an app registered on LinkedIn, X or Meta or a Google OAuth client, is left out. Needs channel:connect.

### Example

```php
<?php
require_once(__DIR__ . '/vendor/autoload.php');


// Configure Bearer authorization: bearer
$config = Peal\Configuration::getDefaultConfiguration()->setAccessToken('YOUR_ACCESS_TOKEN');


$apiInstance = new Peal\Api\ChannelsApi(
    // If you want use custom http client, pass your client which implements `GuzzleHttp\ClientInterface`.
    // This is optional, `GuzzleHttp\Client` will be used as default.
    new GuzzleHttp\Client(),
    $config
);
$workspace_id = 'workspace_id_example'; // string

try {
    $result = $apiInstance->channelsPlatforms($workspace_id);
    print_r($result);
} catch (Exception $e) {
    echo 'Exception when calling ChannelsApi->channelsPlatforms: ', $e->getMessage(), PHP_EOL;
}
```

### Parameters

| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **workspace_id** | **string**|  | |

### Return type

[**\Peal\Model\ConnectablePlatforms**](../Model/ConnectablePlatforms.md)

### Authorization

[bearer](../../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`

[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to Model list]](../../README.md#models)
[[Back to README]](../../README.md)

## `channelsReconnect()`

```php
channelsReconnect($workspace_id, $channel_id): \Peal\Model\Authorization
```

Start reconnecting a channel

Starts reconnecting a channel whose token stopped working or is about to: answers with the platform's sign-in page. Completing it must sign in to the same account. A channel the workspace has takes no room in its plan, so no plan limit refuses it. Needs channel:connect.

### Example

```php
<?php
require_once(__DIR__ . '/vendor/autoload.php');


// Configure Bearer authorization: bearer
$config = Peal\Configuration::getDefaultConfiguration()->setAccessToken('YOUR_ACCESS_TOKEN');


$apiInstance = new Peal\Api\ChannelsApi(
    // If you want use custom http client, pass your client which implements `GuzzleHttp\ClientInterface`.
    // This is optional, `GuzzleHttp\Client` will be used as default.
    new GuzzleHttp\Client(),
    $config
);
$workspace_id = 'workspace_id_example'; // string
$channel_id = 'channel_id_example'; // string

try {
    $result = $apiInstance->channelsReconnect($workspace_id, $channel_id);
    print_r($result);
} catch (Exception $e) {
    echo 'Exception when calling ChannelsApi->channelsReconnect: ', $e->getMessage(), PHP_EOL;
}
```

### Parameters

| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **workspace_id** | **string**|  | |
| **channel_id** | **string**|  | |

### Return type

[**\Peal\Model\Authorization**](../Model/Authorization.md)

### Authorization

[bearer](../../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`

[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to Model list]](../../README.md#models)
[[Back to README]](../../README.md)
