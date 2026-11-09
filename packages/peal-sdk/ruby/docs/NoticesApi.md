# Peal::NoticesApi

All URIs are relative to *https://app.peal.social*

| Method | HTTP request | Description |
| ------ | ------------ | ----------- |
| [**notices_list**](NoticesApi.md#notices_list) | **GET** /api/me/notices | List notices |
| [**notices_mark_all_read**](NoticesApi.md#notices_mark_all_read) | **POST** /api/me/notices/read-all | Mark all notices read |
| [**notices_mark_read**](NoticesApi.md#notices_mark_read) | **POST** /api/me/notices/read | Mark notices read |
| [**notices_unread**](NoticesApi.md#notices_unread) | **GET** /api/me/notices/unread | Count unread notices |


## notices_list

> <NoticePage> notices_list(opts)

List notices

Lists the user's notices, newest first, 20 a page unless `limit` (at most 100) says otherwise. Pass the page's `nextCursor` as `cursor` for the next one. Each notice is data, for the client to write in the reader's language.

### Examples

```ruby
require 'time'
require 'peal'
# setup authorization
Peal.configure do |config|
  # Configure Bearer authorization: bearer
  config.access_token = 'YOUR_BEARER_TOKEN'
end

api_instance = Peal::NoticesApi.new
opts = {
  cursor: 'cursor_example', # String | 
  limit: 'limit_example' # String | 
}

begin
  # List notices
  result = api_instance.notices_list(opts)
  p result
rescue Peal::ApiError => e
  puts "Error when calling NoticesApi->notices_list: #{e}"
end
```

#### Using the notices_list_with_http_info variant

This returns an Array which contains the response data, status code and headers.

> <Array(<NoticePage>, Integer, Hash)> notices_list_with_http_info(opts)

```ruby
begin
  # List notices
  data, status_code, headers = api_instance.notices_list_with_http_info(opts)
  p status_code # => 2xx
  p headers # => { ... }
  p data # => <NoticePage>
rescue Peal::ApiError => e
  puts "Error when calling NoticesApi->notices_list_with_http_info: #{e}"
end
```

### Parameters

| Name | Type | Description | Notes |
| ---- | ---- | ----------- | ----- |
| **cursor** | **String** |  | [optional] |
| **limit** | **String** |  | [optional] |

### Return type

[**NoticePage**](NoticePage.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json


## notices_mark_all_read

> <UnreadNotices> notices_mark_all_read

Mark all notices read

Marks every notice of the user read.

### Examples

```ruby
require 'time'
require 'peal'
# setup authorization
Peal.configure do |config|
  # Configure Bearer authorization: bearer
  config.access_token = 'YOUR_BEARER_TOKEN'
end

api_instance = Peal::NoticesApi.new

begin
  # Mark all notices read
  result = api_instance.notices_mark_all_read
  p result
rescue Peal::ApiError => e
  puts "Error when calling NoticesApi->notices_mark_all_read: #{e}"
end
```

#### Using the notices_mark_all_read_with_http_info variant

This returns an Array which contains the response data, status code and headers.

> <Array(<UnreadNotices>, Integer, Hash)> notices_mark_all_read_with_http_info

```ruby
begin
  # Mark all notices read
  data, status_code, headers = api_instance.notices_mark_all_read_with_http_info
  p status_code # => 2xx
  p headers # => { ... }
  p data # => <UnreadNotices>
rescue Peal::ApiError => e
  puts "Error when calling NoticesApi->notices_mark_all_read_with_http_info: #{e}"
end
```

### Parameters

This endpoint does not need any parameter.

### Return type

[**UnreadNotices**](UnreadNotices.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json


## notices_mark_read

> <UnreadNotices> notices_mark_read(mark_notices_read)

Mark notices read

Marks up to 100 of the user's notices read, and answers with how many stay unread. Ids that name none of the user's notices, and notices already read, are left as they are.

### Examples

```ruby
require 'time'
require 'peal'
# setup authorization
Peal.configure do |config|
  # Configure Bearer authorization: bearer
  config.access_token = 'YOUR_BEARER_TOKEN'
end

api_instance = Peal::NoticesApi.new
mark_notices_read = Peal::MarkNoticesRead.new({ids: ['ids_example']}) # MarkNoticesRead | 

begin
  # Mark notices read
  result = api_instance.notices_mark_read(mark_notices_read)
  p result
rescue Peal::ApiError => e
  puts "Error when calling NoticesApi->notices_mark_read: #{e}"
end
```

#### Using the notices_mark_read_with_http_info variant

This returns an Array which contains the response data, status code and headers.

> <Array(<UnreadNotices>, Integer, Hash)> notices_mark_read_with_http_info(mark_notices_read)

```ruby
begin
  # Mark notices read
  data, status_code, headers = api_instance.notices_mark_read_with_http_info(mark_notices_read)
  p status_code # => 2xx
  p headers # => { ... }
  p data # => <UnreadNotices>
rescue Peal::ApiError => e
  puts "Error when calling NoticesApi->notices_mark_read_with_http_info: #{e}"
end
```

### Parameters

| Name | Type | Description | Notes |
| ---- | ---- | ----------- | ----- |
| **mark_notices_read** | [**MarkNoticesRead**](MarkNoticesRead.md) |  |  |

### Return type

[**UnreadNotices**](UnreadNotices.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json


## notices_unread

> <UnreadNotices> notices_unread

Count unread notices

Counts the user's unread notices.

### Examples

```ruby
require 'time'
require 'peal'
# setup authorization
Peal.configure do |config|
  # Configure Bearer authorization: bearer
  config.access_token = 'YOUR_BEARER_TOKEN'
end

api_instance = Peal::NoticesApi.new

begin
  # Count unread notices
  result = api_instance.notices_unread
  p result
rescue Peal::ApiError => e
  puts "Error when calling NoticesApi->notices_unread: #{e}"
end
```

#### Using the notices_unread_with_http_info variant

This returns an Array which contains the response data, status code and headers.

> <Array(<UnreadNotices>, Integer, Hash)> notices_unread_with_http_info

```ruby
begin
  # Count unread notices
  data, status_code, headers = api_instance.notices_unread_with_http_info
  p status_code # => 2xx
  p headers # => { ... }
  p data # => <UnreadNotices>
rescue Peal::ApiError => e
  puts "Error when calling NoticesApi->notices_unread_with_http_info: #{e}"
end
```

### Parameters

This endpoint does not need any parameter.

### Return type

[**UnreadNotices**](UnreadNotices.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

