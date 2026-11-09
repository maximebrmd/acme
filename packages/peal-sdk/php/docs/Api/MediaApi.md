# Peal\MediaApi



All URIs are relative to https://app.peal.social, except if the operation defines another base path.

| Method | HTTP request | Description |
| ------------- | ------------- | ------------- |
| [**mediaComplete()**](MediaApi.md#mediaComplete) | **POST** /api/workspaces/{workspaceId}/media/{mediaId}/complete | Complete an upload |
| [**mediaCreate()**](MediaApi.md#mediaCreate) | **POST** /api/workspaces/{workspaceId}/media | Start an upload |
| [**mediaDelete()**](MediaApi.md#mediaDelete) | **DELETE** /api/workspaces/{workspaceId}/media/{mediaId} | Delete media |
| [**mediaDescribe()**](MediaApi.md#mediaDescribe) | **PATCH** /api/workspaces/{workspaceId}/media/{mediaId} | Describe media |
| [**mediaGet()**](MediaApi.md#mediaGet) | **GET** /api/workspaces/{workspaceId}/media/{mediaId} | Get media |
| [**mediaList()**](MediaApi.md#mediaList) | **GET** /api/workspaces/{workspaceId}/media | List media |
| [**mediaUsage()**](MediaApi.md#mediaUsage) | **GET** /api/workspaces/{workspaceId}/media/{mediaId}/usage | Get where media is used |


## `mediaComplete()`

```php
mediaComplete($workspace_id, $media_id): \Peal\Model\Media
```

Complete an upload

Checks that the file reached the store with the declared size and type, joining its parts first, then probes it: the media is ready, or stays uploaded with why it could not be probed. Calling it again is safe, and probes an uploaded file again. Needs media:upload.

### Example

```php
<?php
require_once(__DIR__ . '/vendor/autoload.php');


// Configure Bearer authorization: bearer
$config = Peal\Configuration::getDefaultConfiguration()->setAccessToken('YOUR_ACCESS_TOKEN');


$apiInstance = new Peal\Api\MediaApi(
    // If you want use custom http client, pass your client which implements `GuzzleHttp\ClientInterface`.
    // This is optional, `GuzzleHttp\Client` will be used as default.
    new GuzzleHttp\Client(),
    $config
);
$workspace_id = 'workspace_id_example'; // string
$media_id = 'media_id_example'; // string

try {
    $result = $apiInstance->mediaComplete($workspace_id, $media_id);
    print_r($result);
} catch (Exception $e) {
    echo 'Exception when calling MediaApi->mediaComplete: ', $e->getMessage(), PHP_EOL;
}
```

### Parameters

| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **workspace_id** | **string**|  | |
| **media_id** | **string**|  | |

### Return type

[**\Peal\Model\Media**](../Model/Media.md)

### Authorization

[bearer](../../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`

[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to Model list]](../../README.md#models)
[[Back to README]](../../README.md)

## `mediaCreate()`

```php
mediaCreate($workspace_id, $new_upload): \Peal\Model\PreparedUpload
```

Start an upload

Records pending media and signs the upload of its file: one PUT for an image or a video up to 16 MiB, one PUT per part for a larger video. Send the file with them, then complete the upload. The requests only take the declared size and content type. Needs media:upload.

### Example

```php
<?php
require_once(__DIR__ . '/vendor/autoload.php');


// Configure Bearer authorization: bearer
$config = Peal\Configuration::getDefaultConfiguration()->setAccessToken('YOUR_ACCESS_TOKEN');


$apiInstance = new Peal\Api\MediaApi(
    // If you want use custom http client, pass your client which implements `GuzzleHttp\ClientInterface`.
    // This is optional, `GuzzleHttp\Client` will be used as default.
    new GuzzleHttp\Client(),
    $config
);
$workspace_id = 'workspace_id_example'; // string
$new_upload = new \Peal\Model\NewUpload(); // \Peal\Model\NewUpload

try {
    $result = $apiInstance->mediaCreate($workspace_id, $new_upload);
    print_r($result);
} catch (Exception $e) {
    echo 'Exception when calling MediaApi->mediaCreate: ', $e->getMessage(), PHP_EOL;
}
```

### Parameters

| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **workspace_id** | **string**|  | |
| **new_upload** | [**\Peal\Model\NewUpload**](../Model/NewUpload.md)|  | |

### Return type

[**\Peal\Model\PreparedUpload**](../Model/PreparedUpload.md)

### Authorization

[bearer](../../README.md#bearer)

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`

[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to Model list]](../../README.md#models)
[[Back to README]](../../README.md)

## `mediaDelete()`

```php
mediaDelete($workspace_id, $media_id)
```

Delete media

Deletes the media and its file, and cancels its upload if it is still pending. Drafts that show it lose it. Posts scheduled or publishing that show it refuse the deletion (`MediaInUse`, listing them): take them back to draft first. Needs media:delete.

### Example

```php
<?php
require_once(__DIR__ . '/vendor/autoload.php');


// Configure Bearer authorization: bearer
$config = Peal\Configuration::getDefaultConfiguration()->setAccessToken('YOUR_ACCESS_TOKEN');


$apiInstance = new Peal\Api\MediaApi(
    // If you want use custom http client, pass your client which implements `GuzzleHttp\ClientInterface`.
    // This is optional, `GuzzleHttp\Client` will be used as default.
    new GuzzleHttp\Client(),
    $config
);
$workspace_id = 'workspace_id_example'; // string
$media_id = 'media_id_example'; // string

try {
    $apiInstance->mediaDelete($workspace_id, $media_id);
} catch (Exception $e) {
    echo 'Exception when calling MediaApi->mediaDelete: ', $e->getMessage(), PHP_EOL;
}
```

### Parameters

| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **workspace_id** | **string**|  | |
| **media_id** | **string**|  | |

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

## `mediaDescribe()`

```php
mediaDescribe($workspace_id, $media_id, $media_description): \Peal\Model\Media
```

Describe media

Sets the media's description, which platforms show to people who cannot see it. It can be written while the file uploads. Needs media:upload.

### Example

```php
<?php
require_once(__DIR__ . '/vendor/autoload.php');


// Configure Bearer authorization: bearer
$config = Peal\Configuration::getDefaultConfiguration()->setAccessToken('YOUR_ACCESS_TOKEN');


$apiInstance = new Peal\Api\MediaApi(
    // If you want use custom http client, pass your client which implements `GuzzleHttp\ClientInterface`.
    // This is optional, `GuzzleHttp\Client` will be used as default.
    new GuzzleHttp\Client(),
    $config
);
$workspace_id = 'workspace_id_example'; // string
$media_id = 'media_id_example'; // string
$media_description = new \Peal\Model\MediaDescription(); // \Peal\Model\MediaDescription

try {
    $result = $apiInstance->mediaDescribe($workspace_id, $media_id, $media_description);
    print_r($result);
} catch (Exception $e) {
    echo 'Exception when calling MediaApi->mediaDescribe: ', $e->getMessage(), PHP_EOL;
}
```

### Parameters

| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **workspace_id** | **string**|  | |
| **media_id** | **string**|  | |
| **media_description** | [**\Peal\Model\MediaDescription**](../Model/MediaDescription.md)|  | |

### Return type

[**\Peal\Model\Media**](../Model/Media.md)

### Authorization

[bearer](../../README.md#bearer)

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`

[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to Model list]](../../README.md#models)
[[Back to README]](../../README.md)

## `mediaGet()`

```php
mediaGet($workspace_id, $media_id): \Peal\Model\Media
```

Get media

Shows one of the workspace's media. Needs media:read.

### Example

```php
<?php
require_once(__DIR__ . '/vendor/autoload.php');


// Configure Bearer authorization: bearer
$config = Peal\Configuration::getDefaultConfiguration()->setAccessToken('YOUR_ACCESS_TOKEN');


$apiInstance = new Peal\Api\MediaApi(
    // If you want use custom http client, pass your client which implements `GuzzleHttp\ClientInterface`.
    // This is optional, `GuzzleHttp\Client` will be used as default.
    new GuzzleHttp\Client(),
    $config
);
$workspace_id = 'workspace_id_example'; // string
$media_id = 'media_id_example'; // string

try {
    $result = $apiInstance->mediaGet($workspace_id, $media_id);
    print_r($result);
} catch (Exception $e) {
    echo 'Exception when calling MediaApi->mediaGet: ', $e->getMessage(), PHP_EOL;
}
```

### Parameters

| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **workspace_id** | **string**|  | |
| **media_id** | **string**|  | |

### Return type

[**\Peal\Model\Media**](../Model/Media.md)

### Authorization

[bearer](../../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`

[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to Model list]](../../README.md#models)
[[Back to README]](../../README.md)

## `mediaList()`

```php
mediaList($workspace_id, $cursor, $limit): \Peal\Model\MediaPage
```

List media

Lists the workspace's media, newest first, 30 a page unless `limit` (at most 100) says otherwise. Pass the page's `nextCursor` as `cursor` for the next one. Needs media:read.

### Example

```php
<?php
require_once(__DIR__ . '/vendor/autoload.php');


// Configure Bearer authorization: bearer
$config = Peal\Configuration::getDefaultConfiguration()->setAccessToken('YOUR_ACCESS_TOKEN');


$apiInstance = new Peal\Api\MediaApi(
    // If you want use custom http client, pass your client which implements `GuzzleHttp\ClientInterface`.
    // This is optional, `GuzzleHttp\Client` will be used as default.
    new GuzzleHttp\Client(),
    $config
);
$workspace_id = 'workspace_id_example'; // string
$cursor = 'cursor_example'; // string
$limit = 'limit_example'; // string

try {
    $result = $apiInstance->mediaList($workspace_id, $cursor, $limit);
    print_r($result);
} catch (Exception $e) {
    echo 'Exception when calling MediaApi->mediaList: ', $e->getMessage(), PHP_EOL;
}
```

### Parameters

| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **workspace_id** | **string**|  | |
| **cursor** | **string**|  | [optional] |
| **limit** | **string**|  | [optional] |

### Return type

[**\Peal\Model\MediaPage**](../Model/MediaPage.md)

### Authorization

[bearer](../../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`

[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to Model list]](../../README.md#models)
[[Back to README]](../../README.md)

## `mediaUsage()`

```php
mediaUsage($workspace_id, $media_id): \Peal\Model\MediaUsage
```

Get where media is used

Lists the posts that show the media: drafts, which lose it if it is deleted, and posts scheduled or publishing, which keep it from being deleted. Needs media:read.

### Example

```php
<?php
require_once(__DIR__ . '/vendor/autoload.php');


// Configure Bearer authorization: bearer
$config = Peal\Configuration::getDefaultConfiguration()->setAccessToken('YOUR_ACCESS_TOKEN');


$apiInstance = new Peal\Api\MediaApi(
    // If you want use custom http client, pass your client which implements `GuzzleHttp\ClientInterface`.
    // This is optional, `GuzzleHttp\Client` will be used as default.
    new GuzzleHttp\Client(),
    $config
);
$workspace_id = 'workspace_id_example'; // string
$media_id = 'media_id_example'; // string

try {
    $result = $apiInstance->mediaUsage($workspace_id, $media_id);
    print_r($result);
} catch (Exception $e) {
    echo 'Exception when calling MediaApi->mediaUsage: ', $e->getMessage(), PHP_EOL;
}
```

### Parameters

| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **workspace_id** | **string**|  | |
| **media_id** | **string**|  | |

### Return type

[**\Peal\Model\MediaUsage**](../Model/MediaUsage.md)

### Authorization

[bearer](../../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`

[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to Model list]](../../README.md#models)
[[Back to README]](../../README.md)
