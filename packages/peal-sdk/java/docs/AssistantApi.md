# AssistantApi

All URIs are relative to *https://app.peal.social*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**assistantStatus**](AssistantApi.md#assistantStatus) | **GET** /api/workspaces/{workspaceId}/assistant | Get the assistant&#39;s status |
| [**assistantSuggest**](AssistantApi.md#assistantSuggest) | **POST** /api/workspaces/{workspaceId}/assistant/suggestions | Suggest a change to a post&#39;s text |


<a id="assistantStatus"></a>
# **assistantStatus**
> AssistantStatus assistantStatus(workspaceId)

Get the assistant&#39;s status

Tells whether the server has a language model, so clients show the assistant or hide it, and how many requests the workspace has left today. Needs assistant:use.

### Example
```java
// Import classes:
import social.peal.ApiClient;
import social.peal.ApiException;
import social.peal.Configuration;
import social.peal.auth.*;
import social.peal.models.*;
import social.peal.api.AssistantApi;

public class Example {
  public static void main(String[] args) {
    ApiClient defaultClient = Configuration.getDefaultApiClient();
    defaultClient.setBasePath("https://app.peal.social");
    
    // Configure HTTP bearer authorization: bearer
    HttpBearerAuth bearer = (HttpBearerAuth) defaultClient.getAuthentication("bearer");
    bearer.setBearerToken("BEARER TOKEN");

    AssistantApi apiInstance = new AssistantApi(defaultClient);
    String workspaceId = "workspaceId_example"; // String | 
    try {
      AssistantStatus result = apiInstance.assistantStatus(workspaceId);
      System.out.println(result);
    } catch (ApiException e) {
      System.err.println("Exception when calling AssistantApi#assistantStatus");
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

[**AssistantStatus**](AssistantStatus.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | AssistantStatus |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |
| **404** | No workspace with this id is open to the caller. |  -  |

<a id="assistantSuggest"></a>
# **assistantSuggest**
> Suggestion assistantSuggest(workspaceId, suggestionRequest)

Suggest a change to a post&#39;s text

Asks the language model to rewrite, shorten or translate a post&#39;s text, or to suggest hashtags for it, and answers once the whole suggestion is checked. The text is sent to the model as data, never as instructions. Each request counts toward the workspace&#39;s daily quota, unless the model&#39;s provider could not be reached. Needs assistant:use.

### Example
```java
// Import classes:
import social.peal.ApiClient;
import social.peal.ApiException;
import social.peal.Configuration;
import social.peal.auth.*;
import social.peal.models.*;
import social.peal.api.AssistantApi;

public class Example {
  public static void main(String[] args) {
    ApiClient defaultClient = Configuration.getDefaultApiClient();
    defaultClient.setBasePath("https://app.peal.social");
    
    // Configure HTTP bearer authorization: bearer
    HttpBearerAuth bearer = (HttpBearerAuth) defaultClient.getAuthentication("bearer");
    bearer.setBearerToken("BEARER TOKEN");

    AssistantApi apiInstance = new AssistantApi(defaultClient);
    String workspaceId = "workspaceId_example"; // String | 
    SuggestionRequest suggestionRequest = new SuggestionRequest(); // SuggestionRequest | 
    try {
      Suggestion result = apiInstance.assistantSuggest(workspaceId, suggestionRequest);
      System.out.println(result);
    } catch (ApiException e) {
      System.err.println("Exception when calling AssistantApi#assistantSuggest");
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
| **suggestionRequest** | [**SuggestionRequest**](SuggestionRequest.md)|  | |

### Return type

[**Suggestion**](Suggestion.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Suggestion |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |
| **404** | No workspace with this id is open to the caller. |  -  |
| **422** | The text is blank, or longer than the assistant takes (&#x60;maxLength&#x60;). |  -  |
| **429** | The workspace used every assistant request it has today. Try again after &#x60;resetsAt&#x60;. |  -  |
| **502** | The language model gave no answer the assistant can offer (&#x60;reason&#x60;). Trying again may work, unless the provider declined the text. |  -  |
| **503** | The writing assistant is off on this server: no language model is configured. |  -  |

