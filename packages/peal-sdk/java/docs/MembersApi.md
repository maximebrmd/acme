# MembersApi

All URIs are relative to *https://app.peal.social*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**membersList**](MembersApi.md#membersList) | **GET** /api/workspaces/{workspaceId}/members | List members |


<a id="membersList"></a>
# **membersList**
> List&lt;WorkspaceMember&gt; membersList(workspaceId)

List members

Lists the workspace&#39;s members, in the order they joined, with their name, email address and role. Every member may see them, as the workspace&#39;s settings show them; an API key may not, as members&#39; addresses are not a script&#39;s to read.

### Example
```java
// Import classes:
import social.peal.ApiClient;
import social.peal.ApiException;
import social.peal.Configuration;
import social.peal.auth.*;
import social.peal.models.*;
import social.peal.api.MembersApi;

public class Example {
  public static void main(String[] args) {
    ApiClient defaultClient = Configuration.getDefaultApiClient();
    defaultClient.setBasePath("https://app.peal.social");
    
    // Configure HTTP bearer authorization: bearer
    HttpBearerAuth bearer = (HttpBearerAuth) defaultClient.getAuthentication("bearer");
    bearer.setBearerToken("BEARER TOKEN");

    MembersApi apiInstance = new MembersApi(defaultClient);
    String workspaceId = "workspaceId_example"; // String | 
    try {
      List<WorkspaceMember> result = apiInstance.membersList(workspaceId);
      System.out.println(result);
    } catch (ApiException e) {
      System.err.println("Exception when calling MembersApi#membersList");
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

