# InvitationsApi

All URIs are relative to *https://app.peal.social*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**invitationsCreate**](InvitationsApi.md#invitationsCreate) | **POST** /api/workspaces/{workspaceId}/invitations | Invite someone |
| [**invitationsList**](InvitationsApi.md#invitationsList) | **GET** /api/workspaces/{workspaceId}/invitations | List invitations |
| [**invitationsRevoke**](InvitationsApi.md#invitationsRevoke) | **DELETE** /api/workspaces/{workspaceId}/invitations/{invitationId} | Revoke an invitation |


<a id="invitationsCreate"></a>
# **invitationsCreate**
> Invitation invitationsCreate(workspaceId, newInvitation)

Invite someone

Invites someone to the workspace with a role: Peal emails them a link that works for 7 days, in their language when they have an account, in the inviter&#39;s otherwise. A pending invitation to the same address is revoked, and its link stops working. Only owners invite owners. On a server that bills, the members and the other pending invitations must leave room in the workspace&#39;s plan (PlanLimitReached). Needs invitation:create, and a member in person: not an API key, nor staff impersonating one.

### Example
```java
// Import classes:
import social.peal.ApiClient;
import social.peal.ApiException;
import social.peal.Configuration;
import social.peal.auth.*;
import social.peal.models.*;
import social.peal.api.InvitationsApi;

public class Example {
  public static void main(String[] args) {
    ApiClient defaultClient = Configuration.getDefaultApiClient();
    defaultClient.setBasePath("https://app.peal.social");
    
    // Configure HTTP bearer authorization: bearer
    HttpBearerAuth bearer = (HttpBearerAuth) defaultClient.getAuthentication("bearer");
    bearer.setBearerToken("BEARER TOKEN");

    InvitationsApi apiInstance = new InvitationsApi(defaultClient);
    String workspaceId = "workspaceId_example"; // String | 
    NewInvitation newInvitation = new NewInvitation(); // NewInvitation | 
    try {
      Invitation result = apiInstance.invitationsCreate(workspaceId, newInvitation);
      System.out.println(result);
    } catch (ApiException e) {
      System.err.println("Exception when calling InvitationsApi#invitationsCreate");
      System.err.println("Status code: " + e.getCode());
      System.err.println("Reason: " + e.getResponseBody());
      System.err.println("Response headers: " + e.getResponseHeaders());
      e.printStackTrace();
    }
  }
}
```

### Parameters

| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **workspaceId** | **String**|  | |
| **newInvitation** | [**NewInvitation**](NewInvitation.md)|  | |

### Return type

[**Invitation**](Invitation.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **201** | Invitation |  -  |
| **400** | BadRequest |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **402** | The workspace&#39;s plan allows no more of &#x60;limit&#x60;: it has &#x60;allowed&#x60; already. A larger plan, or removing some, makes room. Nothing was changed. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |
| **404** | No workspace with this id is open to the caller. |  -  |
| **409** | The address belongs to a member of the workspace already: nobody was invited. | The workspace has 100 invitations pending, the most it may: revoke some before inviting anyone else. |  -  |

<a id="invitationsList"></a>
# **invitationsList**
> List&lt;Invitation&gt; invitationsList(workspaceId)

List invitations

Lists the workspace&#39;s pending invitations, oldest first, expired ones included. Needs invitation:create, as an invitation&#39;s id opens its link, and a member rather than an API key; invitations to the owner role are listed to owners only.

### Example
```java
// Import classes:
import social.peal.ApiClient;
import social.peal.ApiException;
import social.peal.Configuration;
import social.peal.auth.*;
import social.peal.models.*;
import social.peal.api.InvitationsApi;

public class Example {
  public static void main(String[] args) {
    ApiClient defaultClient = Configuration.getDefaultApiClient();
    defaultClient.setBasePath("https://app.peal.social");
    
    // Configure HTTP bearer authorization: bearer
    HttpBearerAuth bearer = (HttpBearerAuth) defaultClient.getAuthentication("bearer");
    bearer.setBearerToken("BEARER TOKEN");

    InvitationsApi apiInstance = new InvitationsApi(defaultClient);
    String workspaceId = "workspaceId_example"; // String | 
    try {
      List<Invitation> result = apiInstance.invitationsList(workspaceId);
      System.out.println(result);
    } catch (ApiException e) {
      System.err.println("Exception when calling InvitationsApi#invitationsList");
      System.err.println("Status code: " + e.getCode());
      System.err.println("Reason: " + e.getResponseBody());
      System.err.println("Response headers: " + e.getResponseHeaders());
      e.printStackTrace();
    }
  }
}
```

### Parameters

| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **workspaceId** | **String**|  | |

### Return type

[**List&lt;Invitation&gt;**](Invitation.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Success |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |
| **404** | No workspace with this id is open to the caller. |  -  |

<a id="invitationsRevoke"></a>
# **invitationsRevoke**
> invitationsRevoke(workspaceId, invitationId)

Revoke an invitation

Revokes a pending invitation of the workspace: its link stops working at once. Needs invitation:cancel, and a member in person: not an API key, nor staff impersonating one.

### Example
```java
// Import classes:
import social.peal.ApiClient;
import social.peal.ApiException;
import social.peal.Configuration;
import social.peal.auth.*;
import social.peal.models.*;
import social.peal.api.InvitationsApi;

public class Example {
  public static void main(String[] args) {
    ApiClient defaultClient = Configuration.getDefaultApiClient();
    defaultClient.setBasePath("https://app.peal.social");
    
    // Configure HTTP bearer authorization: bearer
    HttpBearerAuth bearer = (HttpBearerAuth) defaultClient.getAuthentication("bearer");
    bearer.setBearerToken("BEARER TOKEN");

    InvitationsApi apiInstance = new InvitationsApi(defaultClient);
    String workspaceId = "workspaceId_example"; // String | 
    String invitationId = "invitationId_example"; // String | 
    try {
      apiInstance.invitationsRevoke(workspaceId, invitationId);
    } catch (ApiException e) {
      System.err.println("Exception when calling InvitationsApi#invitationsRevoke");
      System.err.println("Status code: " + e.getCode());
      System.err.println("Reason: " + e.getResponseBody());
      System.err.println("Response headers: " + e.getResponseHeaders());
      e.printStackTrace();
    }
  }
}
```

### Parameters

| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **workspaceId** | **String**|  | |
| **invitationId** | **String**|  | |

### Return type

null (empty response body)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **204** | &lt;No Content&gt; |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |
| **404** | The workspace has no pending invitation with this id: it was accepted, declined or revoked, or never existed. | No workspace with this id is open to the caller. |  -  |

