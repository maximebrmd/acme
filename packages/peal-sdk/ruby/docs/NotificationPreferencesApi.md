# Peal::NotificationPreferencesApi

All URIs are relative to *https://app.peal.social*

| Method | HTTP request | Description |
| ------ | ------------ | ----------- |
| [**notification_preferences_get**](NotificationPreferencesApi.md#notification_preferences_get) | **GET** /api/me/notification-preferences | Get notification preferences |
| [**notification_preferences_update**](NotificationPreferencesApi.md#notification_preferences_update) | **PATCH** /api/me/notification-preferences | Change notification preferences |


## notification_preferences_get

> <NotificationPreferences> notification_preferences_get

Get notification preferences

Answers with which notices the user receives by email, and whether they hear about every post. Until they change it: failed and unconfirmed posts, and channels to reconnect, but not published posts, are emailed; and they hear only about the posts they wrote.

### Examples

```ruby
require 'time'
require 'peal'
# setup authorization
Peal.configure do |config|
  # Configure Bearer authorization: bearer
  config.access_token = 'YOUR_BEARER_TOKEN'
end

api_instance = Peal::NotificationPreferencesApi.new

begin
  # Get notification preferences
  result = api_instance.notification_preferences_get
  p result
rescue Peal::ApiError => e
  puts "Error when calling NotificationPreferencesApi->notification_preferences_get: #{e}"
end
```

#### Using the notification_preferences_get_with_http_info variant

This returns an Array which contains the response data, status code and headers.

> <Array(<NotificationPreferences>, Integer, Hash)> notification_preferences_get_with_http_info

```ruby
begin
  # Get notification preferences
  data, status_code, headers = api_instance.notification_preferences_get_with_http_info
  p status_code # => 2xx
  p headers # => { ... }
  p data # => <NotificationPreferences>
rescue Peal::ApiError => e
  puts "Error when calling NotificationPreferencesApi->notification_preferences_get_with_http_info: #{e}"
end
```

### Parameters

This endpoint does not need any parameter.

### Return type

[**NotificationPreferences**](NotificationPreferences.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json


## notification_preferences_update

> <NotificationPreferences> notification_preferences_update(notification_preferences_change)

Change notification preferences

Changes the preferences given, keeps the others, and answers with them all. Staff impersonating the user may not change them.

### Examples

```ruby
require 'time'
require 'peal'
# setup authorization
Peal.configure do |config|
  # Configure Bearer authorization: bearer
  config.access_token = 'YOUR_BEARER_TOKEN'
end

api_instance = Peal::NotificationPreferencesApi.new
notification_preferences_change = Peal::NotificationPreferencesChange.new # NotificationPreferencesChange | 

begin
  # Change notification preferences
  result = api_instance.notification_preferences_update(notification_preferences_change)
  p result
rescue Peal::ApiError => e
  puts "Error when calling NotificationPreferencesApi->notification_preferences_update: #{e}"
end
```

#### Using the notification_preferences_update_with_http_info variant

This returns an Array which contains the response data, status code and headers.

> <Array(<NotificationPreferences>, Integer, Hash)> notification_preferences_update_with_http_info(notification_preferences_change)

```ruby
begin
  # Change notification preferences
  data, status_code, headers = api_instance.notification_preferences_update_with_http_info(notification_preferences_change)
  p status_code # => 2xx
  p headers # => { ... }
  p data # => <NotificationPreferences>
rescue Peal::ApiError => e
  puts "Error when calling NotificationPreferencesApi->notification_preferences_update_with_http_info: #{e}"
end
```

### Parameters

| Name | Type | Description | Notes |
| ---- | ---- | ----------- | ----- |
| **notification_preferences_change** | [**NotificationPreferencesChange**](NotificationPreferencesChange.md) |  |  |

### Return type

[**NotificationPreferences**](NotificationPreferences.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

