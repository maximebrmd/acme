# InvitationsApi

All URIs are relative to *https://app.peal.social*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**invitationsCreate**](InvitationsApi.md#invitationscreate) | **POST** /api/workspaces/{workspaceId}/invitations | Invite someone |
| [**invitationsList**](InvitationsApi.md#invitationslist) | **GET** /api/workspaces/{workspaceId}/invitations | List invitations |
| [**invitationsRevoke**](InvitationsApi.md#invitationsrevoke) | **DELETE** /api/workspaces/{workspaceId}/invitations/{invitationId} | Revoke an invitation |



## invitationsCreate

> Invitation invitationsCreate(workspaceId, newInvitation)

Invite someone

Invites someone to the workspace with a role: Peal emails them a link that works for 7 days, in their language when they have an account, in the inviter\&#39;s otherwise. A pending invitation to the same address is revoked, and its link stops working. Only owners invite owners. On a server that bills, the members and the other pending invitations must leave room in the workspace\&#39;s plan (PlanLimitReached). Needs invitation:create, and a member in person: not an API key, nor staff impersonating one.

### Example

```ts
import {
  Configuration,
  InvitationsApi,
} from 'peal-sdk';
import type { InvitationsCreateRequest } from 'peal-sdk';

async function example() {
  console.log("🚀 Testing peal-sdk SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new InvitationsApi(config);

  const body = {
    // string
    workspaceId: workspaceId_example,
    // NewInvitation
    newInvitation: ...,
  } satisfies InvitationsCreateRequest;

  try {
    const data = await api.invitationsCreate(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **workspaceId** | `string` |  | [Defaults to `undefined`] |
| **newInvitation** | [NewInvitation](NewInvitation.md) |  | |

### Return type

[**Invitation**](Invitation.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **201** | Invitation |  -  |
| **400** | BadRequest |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **402** | The workspace\&#39;s plan allows no more of &#x60;limit&#x60;: it has &#x60;allowed&#x60; already. A larger plan, or removing some, makes room. Nothing was changed. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |
| **404** | No workspace with this id is open to the caller. |  -  |
| **409** | The address belongs to a member of the workspace already: nobody was invited. | The workspace has 100 invitations pending, the most it may: revoke some before inviting anyone else. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## invitationsList

> Array&lt;Invitation&gt; invitationsList(workspaceId)

List invitations

Lists the workspace\&#39;s pending invitations, oldest first, expired ones included. Needs invitation:create, as an invitation\&#39;s id opens its link, and a member rather than an API key; invitations to the owner role are listed to owners only.

### Example

```ts
import {
  Configuration,
  InvitationsApi,
} from 'peal-sdk';
import type { InvitationsListRequest } from 'peal-sdk';

async function example() {
  console.log("🚀 Testing peal-sdk SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new InvitationsApi(config);

  const body = {
    // string
    workspaceId: workspaceId_example,
  } satisfies InvitationsListRequest;

  try {
    const data = await api.invitationsList(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **workspaceId** | `string` |  | [Defaults to `undefined`] |

### Return type

[**Array&lt;Invitation&gt;**](Invitation.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Success |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |
| **404** | No workspace with this id is open to the caller. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## invitationsRevoke

> invitationsRevoke(workspaceId, invitationId)

Revoke an invitation

Revokes a pending invitation of the workspace: its link stops working at once. Needs invitation:cancel, and a member in person: not an API key, nor staff impersonating one.

### Example

```ts
import {
  Configuration,
  InvitationsApi,
} from 'peal-sdk';
import type { InvitationsRevokeRequest } from 'peal-sdk';

async function example() {
  console.log("🚀 Testing peal-sdk SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new InvitationsApi(config);

  const body = {
    // string
    workspaceId: workspaceId_example,
    // string
    invitationId: invitationId_example,
  } satisfies InvitationsRevokeRequest;

  try {
    const data = await api.invitationsRevoke(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **workspaceId** | `string` |  | [Defaults to `undefined`] |
| **invitationId** | `string` |  | [Defaults to `undefined`] |

### Return type

`void` (Empty response body)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **204** | &lt;No Content&gt; |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |
| **404** | The workspace has no pending invitation with this id: it was accepted, declined or revoked, or never existed. | No workspace with this id is open to the caller. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

