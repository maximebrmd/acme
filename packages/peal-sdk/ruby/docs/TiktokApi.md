# Peal::TiktokApi

All URIs are relative to *https://app.peal.social*

| Method | HTTP request | Description |
| ------ | ------------ | ----------- |
| [**tiktok_creator**](TiktokApi.md#tiktok_creator) | **GET** /api/workspaces/{workspaceId}/channels/{channelId}/tiktok-creator | Read a TikTok channel&#39;s creator |


## tiktok_creator

> <TikTokAccount> tiktok_creator(channel_id, workspace_id)

Read a TikTok channel's creator

Reads a TikTok channel's creator from TikTok: their nickname, the audiences the account offers, the interactions they turned off and the longest video they may post, or why they cannot post now. A channel that is not TikTok's is ChannelNotFound. Needs post:create.

### Examples

```ruby
require 'time'
require 'peal'
# setup authorization
Peal.configure do |config|
  # Configure Bearer authorization: bearer
  config.access_token = 'YOUR_BEARER_TOKEN'
end

api_instance = Peal::TiktokApi.new
channel_id = 'channel_id_example' # String | 
workspace_id = 'workspace_id_example' # String | 

begin
  # Read a TikTok channel's creator
  result = api_instance.tiktok_creator(channel_id, workspace_id)
  p result
rescue Peal::ApiError => e
  puts "Error when calling TiktokApi->tiktok_creator: #{e}"
end
```

#### Using the tiktok_creator_with_http_info variant

This returns an Array which contains the response data, status code and headers.

> <Array(<TikTokAccount>, Integer, Hash)> tiktok_creator_with_http_info(channel_id, workspace_id)

```ruby
begin
  # Read a TikTok channel's creator
  data, status_code, headers = api_instance.tiktok_creator_with_http_info(channel_id, workspace_id)
  p status_code # => 2xx
  p headers # => { ... }
  p data # => <TikTokAccount>
rescue Peal::ApiError => e
  puts "Error when calling TiktokApi->tiktok_creator_with_http_info: #{e}"
end
```

### Parameters

| Name | Type | Description | Notes |
| ---- | ---- | ----------- | ----- |
| **channel_id** | **String** |  |  |
| **workspace_id** | **String** |  |  |

### Return type

[**TikTokAccount**](TikTokAccount.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

