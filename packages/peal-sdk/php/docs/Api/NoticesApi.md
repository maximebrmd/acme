# Peal\NoticesApi



All URIs are relative to https://app.peal.social, except if the operation defines another base path.

| Method | HTTP request | Description |
| ------------- | ------------- | ------------- |
| [**noticesList()**](NoticesApi.md#noticesList) | **GET** /api/me/notices | List notices |
| [**noticesMarkAllRead()**](NoticesApi.md#noticesMarkAllRead) | **POST** /api/me/notices/read-all | Mark all notices read |
| [**noticesMarkRead()**](NoticesApi.md#noticesMarkRead) | **POST** /api/me/notices/read | Mark notices read |
| [**noticesUnread()**](NoticesApi.md#noticesUnread) | **GET** /api/me/notices/unread | Count unread notices |


## `noticesList()`

```php
noticesList($cursor, $limit): \Peal\Model\NoticePage
```

List notices

Lists the user's notices, newest first, 20 a page unless `limit` (at most 100) says otherwise. Pass the page's `nextCursor` as `cursor` for the next one. Each notice is data, for the client to write in the reader's language.

### Example

```php
<?php
require_once(__DIR__ . '/vendor/autoload.php');


// Configure Bearer authorization: bearer
$config = Peal\Configuration::getDefaultConfiguration()->setAccessToken('YOUR_ACCESS_TOKEN');


$apiInstance = new Peal\Api\NoticesApi(
    // If you want use custom http client, pass your client which implements `GuzzleHttp\ClientInterface`.
    // This is optional, `GuzzleHttp\Client` will be used as default.
    new GuzzleHttp\Client(),
    $config
);
$cursor = 'cursor_example'; // string
$limit = 'limit_example'; // string

try {
    $result = $apiInstance->noticesList($cursor, $limit);
    print_r($result);
} catch (Exception $e) {
    echo 'Exception when calling NoticesApi->noticesList: ', $e->getMessage(), PHP_EOL;
}
```

### Parameters

| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **cursor** | **string**|  | [optional] |
| **limit** | **string**|  | [optional] |

### Return type

[**\Peal\Model\NoticePage**](../Model/NoticePage.md)

### Authorization

[bearer](../../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`

[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to Model list]](../../README.md#models)
[[Back to README]](../../README.md)

## `noticesMarkAllRead()`

```php
noticesMarkAllRead(): \Peal\Model\UnreadNotices
```

Mark all notices read

Marks every notice of the user read.

### Example

```php
<?php
require_once(__DIR__ . '/vendor/autoload.php');


// Configure Bearer authorization: bearer
$config = Peal\Configuration::getDefaultConfiguration()->setAccessToken('YOUR_ACCESS_TOKEN');


$apiInstance = new Peal\Api\NoticesApi(
    // If you want use custom http client, pass your client which implements `GuzzleHttp\ClientInterface`.
    // This is optional, `GuzzleHttp\Client` will be used as default.
    new GuzzleHttp\Client(),
    $config
);

try {
    $result = $apiInstance->noticesMarkAllRead();
    print_r($result);
} catch (Exception $e) {
    echo 'Exception when calling NoticesApi->noticesMarkAllRead: ', $e->getMessage(), PHP_EOL;
}
```

### Parameters

This endpoint does not need any parameter.

### Return type

[**\Peal\Model\UnreadNotices**](../Model/UnreadNotices.md)

### Authorization

[bearer](../../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`

[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to Model list]](../../README.md#models)
[[Back to README]](../../README.md)

## `noticesMarkRead()`

```php
noticesMarkRead($mark_notices_read): \Peal\Model\UnreadNotices
```

Mark notices read

Marks up to 100 of the user's notices read, and answers with how many stay unread. Ids that name none of the user's notices, and notices already read, are left as they are.

### Example

```php
<?php
require_once(__DIR__ . '/vendor/autoload.php');


// Configure Bearer authorization: bearer
$config = Peal\Configuration::getDefaultConfiguration()->setAccessToken('YOUR_ACCESS_TOKEN');


$apiInstance = new Peal\Api\NoticesApi(
    // If you want use custom http client, pass your client which implements `GuzzleHttp\ClientInterface`.
    // This is optional, `GuzzleHttp\Client` will be used as default.
    new GuzzleHttp\Client(),
    $config
);
$mark_notices_read = new \Peal\Model\MarkNoticesRead(); // \Peal\Model\MarkNoticesRead

try {
    $result = $apiInstance->noticesMarkRead($mark_notices_read);
    print_r($result);
} catch (Exception $e) {
    echo 'Exception when calling NoticesApi->noticesMarkRead: ', $e->getMessage(), PHP_EOL;
}
```

### Parameters

| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **mark_notices_read** | [**\Peal\Model\MarkNoticesRead**](../Model/MarkNoticesRead.md)|  | |

### Return type

[**\Peal\Model\UnreadNotices**](../Model/UnreadNotices.md)

### Authorization

[bearer](../../README.md#bearer)

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`

[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to Model list]](../../README.md#models)
[[Back to README]](../../README.md)

## `noticesUnread()`

```php
noticesUnread(): \Peal\Model\UnreadNotices
```

Count unread notices

Counts the user's unread notices.

### Example

```php
<?php
require_once(__DIR__ . '/vendor/autoload.php');


// Configure Bearer authorization: bearer
$config = Peal\Configuration::getDefaultConfiguration()->setAccessToken('YOUR_ACCESS_TOKEN');


$apiInstance = new Peal\Api\NoticesApi(
    // If you want use custom http client, pass your client which implements `GuzzleHttp\ClientInterface`.
    // This is optional, `GuzzleHttp\Client` will be used as default.
    new GuzzleHttp\Client(),
    $config
);

try {
    $result = $apiInstance->noticesUnread();
    print_r($result);
} catch (Exception $e) {
    echo 'Exception when calling NoticesApi->noticesUnread: ', $e->getMessage(), PHP_EOL;
}
```

### Parameters

This endpoint does not need any parameter.

### Return type

[**\Peal\Model\UnreadNotices**](../Model/UnreadNotices.md)

### Authorization

[bearer](../../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`

[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to Model list]](../../README.md#models)
[[Back to README]](../../README.md)
