# MembersApi

All URIs are relative to *https://app.peal.social*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**membersList**](MembersApi.md#memberslist) | **GET** /api/workspaces/{workspaceId}/members | List members |



## membersList

> Array&lt;WorkspaceMember&gt; membersList(workspaceId)

List members

Lists the workspace\&#39;s members, in the order they joined, with their name, email address and role. Every member may see them, as the workspace\&#39;s settings show them; an API key may not, as members\&#39; addresses are not a script\&#39;s to read.

### Example

```ts
import {
  Configuration,
  MembersApi,
} from 'peal';
import type { MembersListRequest } from 'peal';

async function example() {
  console.log("🚀 Testing peal SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new MembersApi(config);

  const body = {
    // string
    workspaceId: workspaceId_example,
  } satisfies MembersListRequest;

  try {
    const data = await api.membersList(body);
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

[**Array&lt;WorkspaceMember&gt;**](WorkspaceMember.md)

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

