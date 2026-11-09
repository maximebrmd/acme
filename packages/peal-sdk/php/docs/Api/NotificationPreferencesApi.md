# Peal\NotificationPreferencesApi



All URIs are relative to https://app.peal.social, except if the operation defines another base path.

| Method | HTTP request | Description |
| ------------- | ------------- | ------------- |
| [**notificationPreferencesGet()**](NotificationPreferencesApi.md#notificationPreferencesGet) | **GET** /api/me/notification-preferences | Get notification preferences |
| [**notificationPreferencesUpdate()**](NotificationPreferencesApi.md#notificationPreferencesUpdate) | **PATCH** /api/me/notification-preferences | Change notification preferences |


## `notificationPreferencesGet()`

```php
notificationPreferencesGet(): \Peal\Model\NotificationPreferences
```

Get notification preferences

Answers with which notices the user receives by email, and whether they hear about every post. Until they change it: failed and unconfirmed posts, and channels to reconnect, but not published posts, are emailed; and they hear only about the posts they wrote.

### Example

```php
<?php
require_once(__DIR__ . '/vendor/autoload.php');


// Configure Bearer authorization: bearer
$config = Peal\Configuration::getDefaultConfiguration()->setAccessToken('YOUR_ACCESS_TOKEN');


$apiInstance = new Peal\Api\NotificationPreferencesApi(
    // If you want use custom http client, pass your client which implements `GuzzleHttp\ClientInterface`.
    // This is optional, `GuzzleHttp\Client` will be used as default.
    new GuzzleHttp\Client(),
    $config
);

try {
    $result = $apiInstance->notificationPreferencesGet();
    print_r($result);
} catch (Exception $e) {
    echo 'Exception when calling NotificationPreferencesApi->notificationPreferencesGet: ', $e->getMessage(), PHP_EOL;
}
```

### Parameters

This endpoint does not need any parameter.

### Return type

[**\Peal\Model\NotificationPreferences**](../Model/NotificationPreferences.md)

### Authorization

[bearer](../../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`

[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to Model list]](../../README.md#models)
[[Back to README]](../../README.md)

## `notificationPreferencesUpdate()`

```php
notificationPreferencesUpdate($notification_preferences_change): \Peal\Model\NotificationPreferences
```

Change notification preferences

Changes the preferences given, keeps the others, and answers with them all. Staff impersonating the user may not change them.

### Example

```php
<?php
require_once(__DIR__ . '/vendor/autoload.php');


// Configure Bearer authorization: bearer
$config = Peal\Configuration::getDefaultConfiguration()->setAccessToken('YOUR_ACCESS_TOKEN');


$apiInstance = new Peal\Api\NotificationPreferencesApi(
    // If you want use custom http client, pass your client which implements `GuzzleHttp\ClientInterface`.
    // This is optional, `GuzzleHttp\Client` will be used as default.
    new GuzzleHttp\Client(),
    $config
);
$notification_preferences_change = new \Peal\Model\NotificationPreferencesChange(); // \Peal\Model\NotificationPreferencesChange

try {
    $result = $apiInstance->notificationPreferencesUpdate($notification_preferences_change);
    print_r($result);
} catch (Exception $e) {
    echo 'Exception when calling NotificationPreferencesApi->notificationPreferencesUpdate: ', $e->getMessage(), PHP_EOL;
}
```

### Parameters

| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **notification_preferences_change** | [**\Peal\Model\NotificationPreferencesChange**](../Model/NotificationPreferencesChange.md)|  | |

### Return type

[**\Peal\Model\NotificationPreferences**](../Model/NotificationPreferences.md)

### Authorization

[bearer](../../README.md#bearer)

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`

[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to Model list]](../../README.md#models)
[[Back to README]](../../README.md)
