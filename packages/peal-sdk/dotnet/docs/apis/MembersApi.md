# Peal.Api.MembersApi

All URIs are relative to *https://app.peal.social*

| Method | HTTP request | Description |
|--------|--------------|-------------|
| [**MembersList**](MembersApi.md#memberslist) | **GET** /api/workspaces/{workspaceId}/members | List members |

<a id="memberslist"></a>
# **MembersList**
> List&lt;WorkspaceMember&gt; MembersList (string workspaceId)

List members

Lists the workspace's members, in the order they joined, with their name, email address and role. Every member may see them, as the workspace's settings show them; an API key may not, as members' addresses are not a script's to read.


### Parameters

| Name | Type | Description | Notes |
|------|------|-------------|-------|
| **workspaceId** | **string** |  |  |

### Return type

[**List&lt;WorkspaceMember&gt;**](WorkspaceMember.md)

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

[[Back to top]](#) [[Back to API list]](../../README.md#documentation-for-api-endpoints) [[Back to Model list]](../../README.md#documentation-for-models) [[Back to README]](../../README.md)

