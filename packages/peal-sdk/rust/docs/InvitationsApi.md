# \InvitationsApi

All URIs are relative to *https://app.peal.social*

Method | HTTP request | Description
------------- | ------------- | -------------
[**invitations_create**](InvitationsApi.md#invitations_create) | **POST** /api/workspaces/{workspaceId}/invitations | Invite someone
[**invitations_list**](InvitationsApi.md#invitations_list) | **GET** /api/workspaces/{workspaceId}/invitations | List invitations
[**invitations_revoke**](InvitationsApi.md#invitations_revoke) | **DELETE** /api/workspaces/{workspaceId}/invitations/{invitationId} | Revoke an invitation



## invitations_create

> models::Invitation invitations_create(workspace_id, new_invitation)
Invite someone

Invites someone to the workspace with a role: Peal emails them a link that works for 7 days, in their language when they have an account, in the inviter's otherwise. A pending invitation to the same address is revoked, and its link stops working. Only owners invite owners. On a server that bills, the members and the other pending invitations must leave room in the workspace's plan (PlanLimitReached). Needs invitation:create, and a member in person: not an API key, nor staff impersonating one.

### Parameters


Name | Type | Description  | Required | Notes
------------- | ------------- | ------------- | ------------- | -------------
**workspace_id** | **String** |  | [required] |
**new_invitation** | [**NewInvitation**](NewInvitation.md) |  | [required] |

### Return type

[**models::Invitation**](Invitation.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)


## invitations_list

> Vec<models::Invitation> invitations_list(workspace_id)
List invitations

Lists the workspace's pending invitations, oldest first, expired ones included. Needs invitation:create, as an invitation's id opens its link, and a member rather than an API key; invitations to the owner role are listed to owners only.

### Parameters


Name | Type | Description  | Required | Notes
------------- | ------------- | ------------- | ------------- | -------------
**workspace_id** | **String** |  | [required] |

### Return type

[**Vec<models::Invitation>**](Invitation.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)


## invitations_revoke

> invitations_revoke(workspace_id, invitation_id)
Revoke an invitation

Revokes a pending invitation of the workspace: its link stops working at once. Needs invitation:cancel, and a member in person: not an API key, nor staff impersonating one.

### Parameters


Name | Type | Description  | Required | Notes
------------- | ------------- | ------------- | ------------- | -------------
**workspace_id** | **String** |  | [required] |
**invitation_id** | **String** |  | [required] |

### Return type

 (empty response body)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

