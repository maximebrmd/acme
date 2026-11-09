# Peal.Api.AssistantApi

All URIs are relative to *https://app.peal.social*

| Method | HTTP request | Description |
|--------|--------------|-------------|
| [**AssistantStatus**](AssistantApi.md#assistantstatus) | **GET** /api/workspaces/{workspaceId}/assistant | Get the assistant&#39;s status |
| [**AssistantSuggest**](AssistantApi.md#assistantsuggest) | **POST** /api/workspaces/{workspaceId}/assistant/suggestions | Suggest a change to a post&#39;s text |

<a id="assistantstatus"></a>
# **AssistantStatus**
> AssistantStatus AssistantStatus (string workspaceId)

Get the assistant's status

Tells whether the server has a language model, so clients show the assistant or hide it, and how many requests the workspace has left today. Needs assistant:use.


### Parameters

| Name | Type | Description | Notes |
|------|------|-------------|-------|
| **workspaceId** | **string** |  |  |

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

[[Back to top]](#) [[Back to API list]](../../README.md#documentation-for-api-endpoints) [[Back to Model list]](../../README.md#documentation-for-models) [[Back to README]](../../README.md)

<a id="assistantsuggest"></a>
# **AssistantSuggest**
> Suggestion AssistantSuggest (string workspaceId, SuggestionRequest suggestionRequest)

Suggest a change to a post's text

Asks the language model to rewrite, shorten or translate a post's text, or to suggest hashtags for it, and answers once the whole suggestion is checked. The text is sent to the model as data, never as instructions. Each request counts toward the workspace's daily quota, unless the model's provider could not be reached. Needs assistant:use.


### Parameters

| Name | Type | Description | Notes |
|------|------|-------------|-------|
| **workspaceId** | **string** |  |  |
| **suggestionRequest** | [**SuggestionRequest**](SuggestionRequest.md) |  |  |

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

[[Back to top]](#) [[Back to API list]](../../README.md#documentation-for-api-endpoints) [[Back to Model list]](../../README.md#documentation-for-models) [[Back to README]](../../README.md)

