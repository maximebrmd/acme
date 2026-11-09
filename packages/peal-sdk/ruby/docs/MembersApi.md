# Peal::MembersApi

All URIs are relative to *https://app.peal.social*

| Method | HTTP request | Description |
| ------ | ------------ | ----------- |
| [**members_list**](MembersApi.md#members_list) | **GET** /api/workspaces/{workspaceId}/members | List members |


## members_list

> <Array<WorkspaceMember>> members_list(workspace_id)

List members

Lists the workspace's members, in the order they joined, with their name, email address and role. Every member may see them, as the workspace's settings show them; an API key may not, as members' addresses are not a script's to read.

### Examples

```ruby
require 'time'
require 'peal'
# setup authorization
Peal.configure do |config|
  # Configure Bearer authorization: bearer
  config.access_token = 'YOUR_BEARER_TOKEN'
end

api_instance = Peal::MembersApi.new
workspace_id = 'workspace_id_example' # String | 

begin
  # List members
  result = api_instance.members_list(workspace_id)
  p result
rescue Peal::ApiError => e
  puts "Error when calling MembersApi->members_list: #{e}"
end
```

#### Using the members_list_with_http_info variant

This returns an Array which contains the response data, status code and headers.

> <Array(<Array<WorkspaceMember>>, Integer, Hash)> members_list_with_http_info(workspace_id)

```ruby
begin
  # List members
  data, status_code, headers = api_instance.members_list_with_http_info(workspace_id)
  p status_code # => 2xx
  p headers # => { ... }
  p data # => <Array<WorkspaceMember>>
rescue Peal::ApiError => e
  puts "Error when calling MembersApi->members_list_with_http_info: #{e}"
end
```

### Parameters

| Name | Type | Description | Notes |
| ---- | ---- | ----------- | ----- |
| **workspace_id** | **String** |  |  |

### Return type

[**Array&lt;WorkspaceMember&gt;**](WorkspaceMember.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

