# Peal::InvitationsApi

All URIs are relative to *https://app.peal.social*

| Method | HTTP request | Description |
| ------ | ------------ | ----------- |
| [**invitations_create**](InvitationsApi.md#invitations_create) | **POST** /api/workspaces/{workspaceId}/invitations | Invite someone |
| [**invitations_list**](InvitationsApi.md#invitations_list) | **GET** /api/workspaces/{workspaceId}/invitations | List invitations |
| [**invitations_revoke**](InvitationsApi.md#invitations_revoke) | **DELETE** /api/workspaces/{workspaceId}/invitations/{invitationId} | Revoke an invitation |


## invitations_create

> <Invitation> invitations_create(workspace_id, new_invitation)

Invite someone

Invites someone to the workspace with a role: Peal emails them a link that works for 7 days, in their language when they have an account, in the inviter's otherwise. A pending invitation to the same address is revoked, and its link stops working. Only owners invite owners. On a server that bills, the members and the other pending invitations must leave room in the workspace's plan (PlanLimitReached). Needs invitation:create, and a member in person: not an API key, nor staff impersonating one.

### Examples

```ruby
require 'time'
require 'peal'
# setup authorization
Peal.configure do |config|
  # Configure Bearer authorization: bearer
  config.access_token = 'YOUR_BEARER_TOKEN'
end

api_instance = Peal::InvitationsApi.new
workspace_id = 'workspace_id_example' # String | 
new_invitation = Peal::NewInvitation.new({email: 'email_example', role: Peal::Role::OWNER}) # NewInvitation | 

begin
  # Invite someone
  result = api_instance.invitations_create(workspace_id, new_invitation)
  p result
rescue Peal::ApiError => e
  puts "Error when calling InvitationsApi->invitations_create: #{e}"
end
```

#### Using the invitations_create_with_http_info variant

This returns an Array which contains the response data, status code and headers.

> <Array(<Invitation>, Integer, Hash)> invitations_create_with_http_info(workspace_id, new_invitation)

```ruby
begin
  # Invite someone
  data, status_code, headers = api_instance.invitations_create_with_http_info(workspace_id, new_invitation)
  p status_code # => 2xx
  p headers # => { ... }
  p data # => <Invitation>
rescue Peal::ApiError => e
  puts "Error when calling InvitationsApi->invitations_create_with_http_info: #{e}"
end
```

### Parameters

| Name | Type | Description | Notes |
| ---- | ---- | ----------- | ----- |
| **workspace_id** | **String** |  |  |
| **new_invitation** | [**NewInvitation**](NewInvitation.md) |  |  |

### Return type

[**Invitation**](Invitation.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json


## invitations_list

> <Array<Invitation>> invitations_list(workspace_id)

List invitations

Lists the workspace's pending invitations, oldest first, expired ones included. Needs invitation:create, as an invitation's id opens its link, and a member rather than an API key; invitations to the owner role are listed to owners only.

### Examples

```ruby
require 'time'
require 'peal'
# setup authorization
Peal.configure do |config|
  # Configure Bearer authorization: bearer
  config.access_token = 'YOUR_BEARER_TOKEN'
end

api_instance = Peal::InvitationsApi.new
workspace_id = 'workspace_id_example' # String | 

begin
  # List invitations
  result = api_instance.invitations_list(workspace_id)
  p result
rescue Peal::ApiError => e
  puts "Error when calling InvitationsApi->invitations_list: #{e}"
end
```

#### Using the invitations_list_with_http_info variant

This returns an Array which contains the response data, status code and headers.

> <Array(<Array<Invitation>>, Integer, Hash)> invitations_list_with_http_info(workspace_id)

```ruby
begin
  # List invitations
  data, status_code, headers = api_instance.invitations_list_with_http_info(workspace_id)
  p status_code # => 2xx
  p headers # => { ... }
  p data # => <Array<Invitation>>
rescue Peal::ApiError => e
  puts "Error when calling InvitationsApi->invitations_list_with_http_info: #{e}"
end
```

### Parameters

| Name | Type | Description | Notes |
| ---- | ---- | ----------- | ----- |
| **workspace_id** | **String** |  |  |

### Return type

[**Array&lt;Invitation&gt;**](Invitation.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json


## invitations_revoke

> invitations_revoke(workspace_id, invitation_id)

Revoke an invitation

Revokes a pending invitation of the workspace: its link stops working at once. Needs invitation:cancel, and a member in person: not an API key, nor staff impersonating one.

### Examples

```ruby
require 'time'
require 'peal'
# setup authorization
Peal.configure do |config|
  # Configure Bearer authorization: bearer
  config.access_token = 'YOUR_BEARER_TOKEN'
end

api_instance = Peal::InvitationsApi.new
workspace_id = 'workspace_id_example' # String | 
invitation_id = 'invitation_id_example' # String | 

begin
  # Revoke an invitation
  api_instance.invitations_revoke(workspace_id, invitation_id)
rescue Peal::ApiError => e
  puts "Error when calling InvitationsApi->invitations_revoke: #{e}"
end
```

#### Using the invitations_revoke_with_http_info variant

This returns an Array which contains the response data (`nil` in this case), status code and headers.

> <Array(nil, Integer, Hash)> invitations_revoke_with_http_info(workspace_id, invitation_id)

```ruby
begin
  # Revoke an invitation
  data, status_code, headers = api_instance.invitations_revoke_with_http_info(workspace_id, invitation_id)
  p status_code # => 2xx
  p headers # => { ... }
  p data # => nil
rescue Peal::ApiError => e
  puts "Error when calling InvitationsApi->invitations_revoke_with_http_info: #{e}"
end
```

### Parameters

| Name | Type | Description | Notes |
| ---- | ---- | ----------- | ----- |
| **workspace_id** | **String** |  |  |
| **invitation_id** | **String** |  |  |

### Return type

nil (empty response body)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

