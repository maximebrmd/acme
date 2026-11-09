# Peal::ChannelsApi

All URIs are relative to *https://app.peal.social*

| Method | HTTP request | Description |
| ------ | ------------ | ----------- |
| [**channels_choose_accounts**](ChannelsApi.md#channels_choose_accounts) | **POST** /api/workspaces/{workspaceId}/channels/connect/{platform}/accounts | Choose the accounts to connect |
| [**channels_complete_connect**](ChannelsApi.md#channels_complete_connect) | **POST** /api/workspaces/{workspaceId}/channels/connect/{platform}/callback | Complete connecting an account |
| [**channels_connect**](ChannelsApi.md#channels_connect) | **POST** /api/workspaces/{workspaceId}/channels/connect/{platform} | Start connecting an account |
| [**channels_disconnect**](ChannelsApi.md#channels_disconnect) | **DELETE** /api/workspaces/{workspaceId}/channels/{channelId} | Disconnect a channel |
| [**channels_list**](ChannelsApi.md#channels_list) | **GET** /api/workspaces/{workspaceId}/channels | List channels |
| [**channels_platforms**](ChannelsApi.md#channels_platforms) | **GET** /api/workspaces/{workspaceId}/channels/platforms | List connectable platforms |
| [**channels_reconnect**](ChannelsApi.md#channels_reconnect) | **POST** /api/workspaces/{workspaceId}/channels/{channelId}/reconnect | Start reconnecting a channel |


## channels_choose_accounts

> <Array<Channel>> channels_choose_accounts(workspace_id, platform, choose_accounts)

Choose the accounts to connect

Connects the accounts the member chose among those a completed sign-in listed: each becomes a channel of the workspace, or reconnects the one it has. The new accounts chosen need room in the workspace's plan, all of them: otherwise none is connected (PlanLimitReached), and the choice can be made again with fewer. Only the member who completed the sign-in can choose, within 15 minutes, and once an account is connected: a choice that failed before connecting any can be made again. Needs channel:connect.

### Examples

```ruby
require 'time'
require 'peal'
# setup authorization
Peal.configure do |config|
  # Configure Bearer authorization: bearer
  config.access_token = 'YOUR_BEARER_TOKEN'
end

api_instance = Peal::ChannelsApi.new
workspace_id = 'workspace_id_example' # String | 
platform = Peal::Platform::X # Platform | 
choose_accounts = Peal::ChooseAccounts.new({account_ids: ['account_ids_example'], selection: 'selection_example'}) # ChooseAccounts | 

begin
  # Choose the accounts to connect
  result = api_instance.channels_choose_accounts(workspace_id, platform, choose_accounts)
  p result
rescue Peal::ApiError => e
  puts "Error when calling ChannelsApi->channels_choose_accounts: #{e}"
end
```

#### Using the channels_choose_accounts_with_http_info variant

This returns an Array which contains the response data, status code and headers.

> <Array(<Array<Channel>>, Integer, Hash)> channels_choose_accounts_with_http_info(workspace_id, platform, choose_accounts)

```ruby
begin
  # Choose the accounts to connect
  data, status_code, headers = api_instance.channels_choose_accounts_with_http_info(workspace_id, platform, choose_accounts)
  p status_code # => 2xx
  p headers # => { ... }
  p data # => <Array<Channel>>
rescue Peal::ApiError => e
  puts "Error when calling ChannelsApi->channels_choose_accounts_with_http_info: #{e}"
end
```

### Parameters

| Name | Type | Description | Notes |
| ---- | ---- | ----------- | ----- |
| **workspace_id** | **String** |  |  |
| **platform** | [**Platform**](.md) |  |  |
| **choose_accounts** | [**ChooseAccounts**](ChooseAccounts.md) |  |  |

### Return type

[**Array&lt;Channel&gt;**](Channel.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json


## channels_complete_connect

> <ConnectOutcome> channels_complete_connect(workspace_id, platform, connect_callback)

Complete connecting an account

Completes a connection with what the platform sent back: the account becomes a channel of the workspace, or the channel it reconnects takes its new tokens. When the sign-in reached several accounts, as the Pages a Facebook user manages, the answer lists them instead, to choose with chooseAccounts. Only the member who started the connection can complete it, once. A new account needs room in the workspace's plan (PlanLimitReached). Needs channel:connect.

### Examples

```ruby
require 'time'
require 'peal'
# setup authorization
Peal.configure do |config|
  # Configure Bearer authorization: bearer
  config.access_token = 'YOUR_BEARER_TOKEN'
end

api_instance = Peal::ChannelsApi.new
workspace_id = 'workspace_id_example' # String | 
platform = Peal::Platform::X # Platform | 
connect_callback = Peal::ConnectCallback.new({state: 'state_example'}) # ConnectCallback | 

begin
  # Complete connecting an account
  result = api_instance.channels_complete_connect(workspace_id, platform, connect_callback)
  p result
rescue Peal::ApiError => e
  puts "Error when calling ChannelsApi->channels_complete_connect: #{e}"
end
```

#### Using the channels_complete_connect_with_http_info variant

This returns an Array which contains the response data, status code and headers.

> <Array(<ConnectOutcome>, Integer, Hash)> channels_complete_connect_with_http_info(workspace_id, platform, connect_callback)

```ruby
begin
  # Complete connecting an account
  data, status_code, headers = api_instance.channels_complete_connect_with_http_info(workspace_id, platform, connect_callback)
  p status_code # => 2xx
  p headers # => { ... }
  p data # => <ConnectOutcome>
rescue Peal::ApiError => e
  puts "Error when calling ChannelsApi->channels_complete_connect_with_http_info: #{e}"
end
```

### Parameters

| Name | Type | Description | Notes |
| ---- | ---- | ----------- | ----- |
| **workspace_id** | **String** |  |  |
| **platform** | [**Platform**](.md) |  |  |
| **connect_callback** | [**ConnectCallback**](ConnectCallback.md) |  |  |

### Return type

[**ConnectOutcome**](ConnectOutcome.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json


## channels_connect

> <Authorization> channels_connect(workspace_id, platform, connect_channel)

Start connecting an account

Starts connecting an account of the platform: answers with the platform's sign-in page, where the browser goes next. For Instagram, `connection` picks Instagram Login (the professional account itself, no Facebook Page needed) or Facebook Login (the accounts linked to the caller's Pages); without it, the server's preferred way. The connection is tied to the caller and the workspace, and must be completed within 15 minutes. On a server that bills, a workspace whose plan allows no more channels gets PlanLimitReached. Needs channel:connect.

### Examples

```ruby
require 'time'
require 'peal'
# setup authorization
Peal.configure do |config|
  # Configure Bearer authorization: bearer
  config.access_token = 'YOUR_BEARER_TOKEN'
end

api_instance = Peal::ChannelsApi.new
workspace_id = 'workspace_id_example' # String | 
platform = Peal::Platform::X # Platform | 
connect_channel = Peal::ConnectChannel.new # ConnectChannel | 

begin
  # Start connecting an account
  result = api_instance.channels_connect(workspace_id, platform, connect_channel)
  p result
rescue Peal::ApiError => e
  puts "Error when calling ChannelsApi->channels_connect: #{e}"
end
```

#### Using the channels_connect_with_http_info variant

This returns an Array which contains the response data, status code and headers.

> <Array(<Authorization>, Integer, Hash)> channels_connect_with_http_info(workspace_id, platform, connect_channel)

```ruby
begin
  # Start connecting an account
  data, status_code, headers = api_instance.channels_connect_with_http_info(workspace_id, platform, connect_channel)
  p status_code # => 2xx
  p headers # => { ... }
  p data # => <Authorization>
rescue Peal::ApiError => e
  puts "Error when calling ChannelsApi->channels_connect_with_http_info: #{e}"
end
```

### Parameters

| Name | Type | Description | Notes |
| ---- | ---- | ----------- | ----- |
| **workspace_id** | **String** |  |  |
| **platform** | [**Platform**](.md) |  |  |
| **connect_channel** | [**ConnectChannel**](ConnectChannel.md) |  |  |

### Return type

[**Authorization**](Authorization.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json


## channels_disconnect

> channels_disconnect(workspace_id, channel_id)

Disconnect a channel

Disconnects a channel from the workspace: the channel and the tokens Peal holds for it are deleted, and nothing more is posted on it. Needs channel:disconnect.

### Examples

```ruby
require 'time'
require 'peal'
# setup authorization
Peal.configure do |config|
  # Configure Bearer authorization: bearer
  config.access_token = 'YOUR_BEARER_TOKEN'
end

api_instance = Peal::ChannelsApi.new
workspace_id = 'workspace_id_example' # String | 
channel_id = 'channel_id_example' # String | 

begin
  # Disconnect a channel
  api_instance.channels_disconnect(workspace_id, channel_id)
rescue Peal::ApiError => e
  puts "Error when calling ChannelsApi->channels_disconnect: #{e}"
end
```

#### Using the channels_disconnect_with_http_info variant

This returns an Array which contains the response data (`nil` in this case), status code and headers.

> <Array(nil, Integer, Hash)> channels_disconnect_with_http_info(workspace_id, channel_id)

```ruby
begin
  # Disconnect a channel
  data, status_code, headers = api_instance.channels_disconnect_with_http_info(workspace_id, channel_id)
  p status_code # => 2xx
  p headers # => { ... }
  p data # => nil
rescue Peal::ApiError => e
  puts "Error when calling ChannelsApi->channels_disconnect_with_http_info: #{e}"
end
```

### Parameters

| Name | Type | Description | Notes |
| ---- | ---- | ----------- | ----- |
| **workspace_id** | **String** |  |  |
| **channel_id** | **String** |  |  |

### Return type

nil (empty response body)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json


## channels_list

> <Array<Channel>> channels_list(workspace_id)

List channels

Lists the channels connected to the workspace, oldest first. Their tokens are never shown. Needs channel:read.

### Examples

```ruby
require 'time'
require 'peal'
# setup authorization
Peal.configure do |config|
  # Configure Bearer authorization: bearer
  config.access_token = 'YOUR_BEARER_TOKEN'
end

api_instance = Peal::ChannelsApi.new
workspace_id = 'workspace_id_example' # String | 

begin
  # List channels
  result = api_instance.channels_list(workspace_id)
  p result
rescue Peal::ApiError => e
  puts "Error when calling ChannelsApi->channels_list: #{e}"
end
```

#### Using the channels_list_with_http_info variant

This returns an Array which contains the response data, status code and headers.

> <Array(<Array<Channel>>, Integer, Hash)> channels_list_with_http_info(workspace_id)

```ruby
begin
  # List channels
  data, status_code, headers = api_instance.channels_list_with_http_info(workspace_id)
  p status_code # => 2xx
  p headers # => { ... }
  p data # => <Array<Channel>>
rescue Peal::ApiError => e
  puts "Error when calling ChannelsApi->channels_list_with_http_info: #{e}"
end
```

### Parameters

| Name | Type | Description | Notes |
| ---- | ---- | ----------- | ----- |
| **workspace_id** | **String** |  |  |

### Return type

[**Array&lt;Channel&gt;**](Channel.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json


## channels_platforms

> <ConnectablePlatforms> channels_platforms(workspace_id)

List connectable platforms

Lists the platforms this server can connect accounts of, in Peal's order. A platform that needs a setting the server lacks, such as an app registered on LinkedIn, X or Meta or a Google OAuth client, is left out. Needs channel:connect.

### Examples

```ruby
require 'time'
require 'peal'
# setup authorization
Peal.configure do |config|
  # Configure Bearer authorization: bearer
  config.access_token = 'YOUR_BEARER_TOKEN'
end

api_instance = Peal::ChannelsApi.new
workspace_id = 'workspace_id_example' # String | 

begin
  # List connectable platforms
  result = api_instance.channels_platforms(workspace_id)
  p result
rescue Peal::ApiError => e
  puts "Error when calling ChannelsApi->channels_platforms: #{e}"
end
```

#### Using the channels_platforms_with_http_info variant

This returns an Array which contains the response data, status code and headers.

> <Array(<ConnectablePlatforms>, Integer, Hash)> channels_platforms_with_http_info(workspace_id)

```ruby
begin
  # List connectable platforms
  data, status_code, headers = api_instance.channels_platforms_with_http_info(workspace_id)
  p status_code # => 2xx
  p headers # => { ... }
  p data # => <ConnectablePlatforms>
rescue Peal::ApiError => e
  puts "Error when calling ChannelsApi->channels_platforms_with_http_info: #{e}"
end
```

### Parameters

| Name | Type | Description | Notes |
| ---- | ---- | ----------- | ----- |
| **workspace_id** | **String** |  |  |

### Return type

[**ConnectablePlatforms**](ConnectablePlatforms.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json


## channels_reconnect

> <Authorization> channels_reconnect(workspace_id, channel_id)

Start reconnecting a channel

Starts reconnecting a channel whose token stopped working or is about to: answers with the platform's sign-in page. Completing it must sign in to the same account. A channel the workspace has takes no room in its plan, so no plan limit refuses it. Needs channel:connect.

### Examples

```ruby
require 'time'
require 'peal'
# setup authorization
Peal.configure do |config|
  # Configure Bearer authorization: bearer
  config.access_token = 'YOUR_BEARER_TOKEN'
end

api_instance = Peal::ChannelsApi.new
workspace_id = 'workspace_id_example' # String | 
channel_id = 'channel_id_example' # String | 

begin
  # Start reconnecting a channel
  result = api_instance.channels_reconnect(workspace_id, channel_id)
  p result
rescue Peal::ApiError => e
  puts "Error when calling ChannelsApi->channels_reconnect: #{e}"
end
```

#### Using the channels_reconnect_with_http_info variant

This returns an Array which contains the response data, status code and headers.

> <Array(<Authorization>, Integer, Hash)> channels_reconnect_with_http_info(workspace_id, channel_id)

```ruby
begin
  # Start reconnecting a channel
  data, status_code, headers = api_instance.channels_reconnect_with_http_info(workspace_id, channel_id)
  p status_code # => 2xx
  p headers # => { ... }
  p data # => <Authorization>
rescue Peal::ApiError => e
  puts "Error when calling ChannelsApi->channels_reconnect_with_http_info: #{e}"
end
```

### Parameters

| Name | Type | Description | Notes |
| ---- | ---- | ----------- | ----- |
| **workspace_id** | **String** |  |  |
| **channel_id** | **String** |  |  |

### Return type

[**Authorization**](Authorization.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

