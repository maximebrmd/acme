# \AssistantApi

All URIs are relative to *https://app.peal.social*

Method | HTTP request | Description
------------- | ------------- | -------------
[**assistant_status**](AssistantApi.md#assistant_status) | **GET** /api/workspaces/{workspaceId}/assistant | Get the assistant's status
[**assistant_suggest**](AssistantApi.md#assistant_suggest) | **POST** /api/workspaces/{workspaceId}/assistant/suggestions | Suggest a change to a post's text



## assistant_status

> models::AssistantStatus assistant_status(workspace_id)
Get the assistant's status

Tells whether the server has a language model, so clients show the assistant or hide it, and how many requests the workspace has left today. Needs assistant:use.

### Parameters


Name | Type | Description  | Required | Notes
------------- | ------------- | ------------- | ------------- | -------------
**workspace_id** | **String** |  | [required] |

### Return type

[**models::AssistantStatus**](AssistantStatus.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)


## assistant_suggest

> models::Suggestion assistant_suggest(workspace_id, suggestion_request)
Suggest a change to a post's text

Asks the language model to rewrite, shorten or translate a post's text, or to suggest hashtags for it, and answers once the whole suggestion is checked. The text is sent to the model as data, never as instructions. Each request counts toward the workspace's daily quota, unless the model's provider could not be reached. Needs assistant:use.

### Parameters


Name | Type | Description  | Required | Notes
------------- | ------------- | ------------- | ------------- | -------------
**workspace_id** | **String** |  | [required] |
**suggestion_request** | [**SuggestionRequest**](SuggestionRequest.md) |  | [required] |

### Return type

[**models::Suggestion**](Suggestion.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

