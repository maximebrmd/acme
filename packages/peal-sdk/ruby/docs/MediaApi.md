# Peal::MediaApi

All URIs are relative to *https://app.peal.social*

| Method | HTTP request | Description |
| ------ | ------------ | ----------- |
| [**media_complete**](MediaApi.md#media_complete) | **POST** /api/workspaces/{workspaceId}/media/{mediaId}/complete | Complete an upload |
| [**media_create**](MediaApi.md#media_create) | **POST** /api/workspaces/{workspaceId}/media | Start an upload |
| [**media_delete**](MediaApi.md#media_delete) | **DELETE** /api/workspaces/{workspaceId}/media/{mediaId} | Delete media |
| [**media_describe**](MediaApi.md#media_describe) | **PATCH** /api/workspaces/{workspaceId}/media/{mediaId} | Describe media |
| [**media_get**](MediaApi.md#media_get) | **GET** /api/workspaces/{workspaceId}/media/{mediaId} | Get media |
| [**media_list**](MediaApi.md#media_list) | **GET** /api/workspaces/{workspaceId}/media | List media |
| [**media_usage**](MediaApi.md#media_usage) | **GET** /api/workspaces/{workspaceId}/media/{mediaId}/usage | Get where media is used |


## media_complete

> <Media> media_complete(workspace_id, media_id)

Complete an upload

Checks that the file reached the store with the declared size and type, joining its parts first, then probes it: the media is ready, or stays uploaded with why it could not be probed. Calling it again is safe, and probes an uploaded file again. Needs media:upload.

### Examples

```ruby
require 'time'
require 'peal'
# setup authorization
Peal.configure do |config|
  # Configure Bearer authorization: bearer
  config.access_token = 'YOUR_BEARER_TOKEN'
end

api_instance = Peal::MediaApi.new
workspace_id = 'workspace_id_example' # String | 
media_id = 'media_id_example' # String | 

begin
  # Complete an upload
  result = api_instance.media_complete(workspace_id, media_id)
  p result
rescue Peal::ApiError => e
  puts "Error when calling MediaApi->media_complete: #{e}"
end
```

#### Using the media_complete_with_http_info variant

This returns an Array which contains the response data, status code and headers.

> <Array(<Media>, Integer, Hash)> media_complete_with_http_info(workspace_id, media_id)

```ruby
begin
  # Complete an upload
  data, status_code, headers = api_instance.media_complete_with_http_info(workspace_id, media_id)
  p status_code # => 2xx
  p headers # => { ... }
  p data # => <Media>
rescue Peal::ApiError => e
  puts "Error when calling MediaApi->media_complete_with_http_info: #{e}"
end
```

### Parameters

| Name | Type | Description | Notes |
| ---- | ---- | ----------- | ----- |
| **workspace_id** | **String** |  |  |
| **media_id** | **String** |  |  |

### Return type

[**Media**](Media.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json


## media_create

> <PreparedUpload> media_create(workspace_id, new_upload)

Start an upload

Records pending media and signs the upload of its file: one PUT for an image or a video up to 16 MiB, one PUT per part for a larger video. Send the file with them, then complete the upload. The requests only take the declared size and content type. On a server that bills, the declared size must fit the plan's media storage with what the workspace stores (PlanLimitReached `mediaStorage`). Needs media:upload.

### Examples

```ruby
require 'time'
require 'peal'
# setup authorization
Peal.configure do |config|
  # Configure Bearer authorization: bearer
  config.access_token = 'YOUR_BEARER_TOKEN'
end

api_instance = Peal::MediaApi.new
workspace_id = 'workspace_id_example' # String | 
new_upload = Peal::NewUpload.new({byte_size: 37, content_type: 'content_type_example'}) # NewUpload | 

begin
  # Start an upload
  result = api_instance.media_create(workspace_id, new_upload)
  p result
rescue Peal::ApiError => e
  puts "Error when calling MediaApi->media_create: #{e}"
end
```

#### Using the media_create_with_http_info variant

This returns an Array which contains the response data, status code and headers.

> <Array(<PreparedUpload>, Integer, Hash)> media_create_with_http_info(workspace_id, new_upload)

```ruby
begin
  # Start an upload
  data, status_code, headers = api_instance.media_create_with_http_info(workspace_id, new_upload)
  p status_code # => 2xx
  p headers # => { ... }
  p data # => <PreparedUpload>
rescue Peal::ApiError => e
  puts "Error when calling MediaApi->media_create_with_http_info: #{e}"
end
```

### Parameters

| Name | Type | Description | Notes |
| ---- | ---- | ----------- | ----- |
| **workspace_id** | **String** |  |  |
| **new_upload** | [**NewUpload**](NewUpload.md) |  |  |

### Return type

[**PreparedUpload**](PreparedUpload.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json


## media_delete

> media_delete(workspace_id, media_id)

Delete media

Deletes the media and its file, and cancels its upload if it is still pending. Drafts that show it lose it. Posts scheduled or publishing that show it refuse the deletion (`MediaInUse`, listing them): take them back to draft first. Needs media:delete.

### Examples

```ruby
require 'time'
require 'peal'
# setup authorization
Peal.configure do |config|
  # Configure Bearer authorization: bearer
  config.access_token = 'YOUR_BEARER_TOKEN'
end

api_instance = Peal::MediaApi.new
workspace_id = 'workspace_id_example' # String | 
media_id = 'media_id_example' # String | 

begin
  # Delete media
  api_instance.media_delete(workspace_id, media_id)
rescue Peal::ApiError => e
  puts "Error when calling MediaApi->media_delete: #{e}"
end
```

#### Using the media_delete_with_http_info variant

This returns an Array which contains the response data (`nil` in this case), status code and headers.

> <Array(nil, Integer, Hash)> media_delete_with_http_info(workspace_id, media_id)

```ruby
begin
  # Delete media
  data, status_code, headers = api_instance.media_delete_with_http_info(workspace_id, media_id)
  p status_code # => 2xx
  p headers # => { ... }
  p data # => nil
rescue Peal::ApiError => e
  puts "Error when calling MediaApi->media_delete_with_http_info: #{e}"
end
```

### Parameters

| Name | Type | Description | Notes |
| ---- | ---- | ----------- | ----- |
| **workspace_id** | **String** |  |  |
| **media_id** | **String** |  |  |

### Return type

nil (empty response body)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json


## media_describe

> <Media> media_describe(workspace_id, media_id, media_description)

Describe media

Sets the media's description, which platforms show to people who cannot see it. It can be written while the file uploads. Needs media:upload.

### Examples

```ruby
require 'time'
require 'peal'
# setup authorization
Peal.configure do |config|
  # Configure Bearer authorization: bearer
  config.access_token = 'YOUR_BEARER_TOKEN'
end

api_instance = Peal::MediaApi.new
workspace_id = 'workspace_id_example' # String | 
media_id = 'media_id_example' # String | 
media_description = Peal::MediaDescription.new({alt_text: 'alt_text_example'}) # MediaDescription | 

begin
  # Describe media
  result = api_instance.media_describe(workspace_id, media_id, media_description)
  p result
rescue Peal::ApiError => e
  puts "Error when calling MediaApi->media_describe: #{e}"
end
```

#### Using the media_describe_with_http_info variant

This returns an Array which contains the response data, status code and headers.

> <Array(<Media>, Integer, Hash)> media_describe_with_http_info(workspace_id, media_id, media_description)

```ruby
begin
  # Describe media
  data, status_code, headers = api_instance.media_describe_with_http_info(workspace_id, media_id, media_description)
  p status_code # => 2xx
  p headers # => { ... }
  p data # => <Media>
rescue Peal::ApiError => e
  puts "Error when calling MediaApi->media_describe_with_http_info: #{e}"
end
```

### Parameters

| Name | Type | Description | Notes |
| ---- | ---- | ----------- | ----- |
| **workspace_id** | **String** |  |  |
| **media_id** | **String** |  |  |
| **media_description** | [**MediaDescription**](MediaDescription.md) |  |  |

### Return type

[**Media**](Media.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json


## media_get

> <Media> media_get(workspace_id, media_id)

Get media

Shows one of the workspace's media. Needs media:read.

### Examples

```ruby
require 'time'
require 'peal'
# setup authorization
Peal.configure do |config|
  # Configure Bearer authorization: bearer
  config.access_token = 'YOUR_BEARER_TOKEN'
end

api_instance = Peal::MediaApi.new
workspace_id = 'workspace_id_example' # String | 
media_id = 'media_id_example' # String | 

begin
  # Get media
  result = api_instance.media_get(workspace_id, media_id)
  p result
rescue Peal::ApiError => e
  puts "Error when calling MediaApi->media_get: #{e}"
end
```

#### Using the media_get_with_http_info variant

This returns an Array which contains the response data, status code and headers.

> <Array(<Media>, Integer, Hash)> media_get_with_http_info(workspace_id, media_id)

```ruby
begin
  # Get media
  data, status_code, headers = api_instance.media_get_with_http_info(workspace_id, media_id)
  p status_code # => 2xx
  p headers # => { ... }
  p data # => <Media>
rescue Peal::ApiError => e
  puts "Error when calling MediaApi->media_get_with_http_info: #{e}"
end
```

### Parameters

| Name | Type | Description | Notes |
| ---- | ---- | ----------- | ----- |
| **workspace_id** | **String** |  |  |
| **media_id** | **String** |  |  |

### Return type

[**Media**](Media.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json


## media_list

> <MediaPage> media_list(workspace_id, opts)

List media

Lists the workspace's media, newest first, 30 a page unless `limit` (at most 100) says otherwise. Pass the page's `nextCursor` as `cursor` for the next one. Needs media:read.

### Examples

```ruby
require 'time'
require 'peal'
# setup authorization
Peal.configure do |config|
  # Configure Bearer authorization: bearer
  config.access_token = 'YOUR_BEARER_TOKEN'
end

api_instance = Peal::MediaApi.new
workspace_id = 'workspace_id_example' # String | 
opts = {
  cursor: 'cursor_example', # String | 
  limit: 'limit_example' # String | 
}

begin
  # List media
  result = api_instance.media_list(workspace_id, opts)
  p result
rescue Peal::ApiError => e
  puts "Error when calling MediaApi->media_list: #{e}"
end
```

#### Using the media_list_with_http_info variant

This returns an Array which contains the response data, status code and headers.

> <Array(<MediaPage>, Integer, Hash)> media_list_with_http_info(workspace_id, opts)

```ruby
begin
  # List media
  data, status_code, headers = api_instance.media_list_with_http_info(workspace_id, opts)
  p status_code # => 2xx
  p headers # => { ... }
  p data # => <MediaPage>
rescue Peal::ApiError => e
  puts "Error when calling MediaApi->media_list_with_http_info: #{e}"
end
```

### Parameters

| Name | Type | Description | Notes |
| ---- | ---- | ----------- | ----- |
| **workspace_id** | **String** |  |  |
| **cursor** | **String** |  | [optional] |
| **limit** | **String** |  | [optional] |

### Return type

[**MediaPage**](MediaPage.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json


## media_usage

> <MediaUsage> media_usage(workspace_id, media_id)

Get where media is used

Lists the posts that show the media: drafts, which lose it if it is deleted, and posts scheduled or publishing, which keep it from being deleted. Needs media:read.

### Examples

```ruby
require 'time'
require 'peal'
# setup authorization
Peal.configure do |config|
  # Configure Bearer authorization: bearer
  config.access_token = 'YOUR_BEARER_TOKEN'
end

api_instance = Peal::MediaApi.new
workspace_id = 'workspace_id_example' # String | 
media_id = 'media_id_example' # String | 

begin
  # Get where media is used
  result = api_instance.media_usage(workspace_id, media_id)
  p result
rescue Peal::ApiError => e
  puts "Error when calling MediaApi->media_usage: #{e}"
end
```

#### Using the media_usage_with_http_info variant

This returns an Array which contains the response data, status code and headers.

> <Array(<MediaUsage>, Integer, Hash)> media_usage_with_http_info(workspace_id, media_id)

```ruby
begin
  # Get where media is used
  data, status_code, headers = api_instance.media_usage_with_http_info(workspace_id, media_id)
  p status_code # => 2xx
  p headers # => { ... }
  p data # => <MediaUsage>
rescue Peal::ApiError => e
  puts "Error when calling MediaApi->media_usage_with_http_info: #{e}"
end
```

### Parameters

| Name | Type | Description | Notes |
| ---- | ---- | ----------- | ----- |
| **workspace_id** | **String** |  |  |
| **media_id** | **String** |  |  |

### Return type

[**MediaUsage**](MediaUsage.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

