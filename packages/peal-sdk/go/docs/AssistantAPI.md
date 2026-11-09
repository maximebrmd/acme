# \AssistantAPI

All URIs are relative to *https://app.peal.social*

Method | HTTP request | Description
------------- | ------------- | -------------
[**AssistantStatus**](AssistantAPI.md#AssistantStatus) | **Get** /api/workspaces/{workspaceId}/assistant | Get the assistant&#39;s status
[**AssistantSuggest**](AssistantAPI.md#AssistantSuggest) | **Post** /api/workspaces/{workspaceId}/assistant/suggestions | Suggest a change to a post&#39;s text



## AssistantStatus

> AssistantStatus AssistantStatus(ctx, workspaceId).Execute()

Get the assistant's status



### Example

```go
package main

import (
	"context"
	"fmt"
	"os"
	openapiclient "github.com/peal-social/peal/packages/peal-sdk/go"
)

func main() {
	workspaceId := "workspaceId_example" // string | 

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.AssistantAPI.AssistantStatus(context.Background(), workspaceId).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `AssistantAPI.AssistantStatus``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `AssistantStatus`: AssistantStatus
	fmt.Fprintf(os.Stdout, "Response from `AssistantAPI.AssistantStatus`: %v\n", resp)
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**workspaceId** | **string** |  | 

### Other Parameters

Other parameters are passed through a pointer to a apiAssistantStatusRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------


### Return type

[**AssistantStatus**](AssistantStatus.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## AssistantSuggest

> Suggestion AssistantSuggest(ctx, workspaceId).SuggestionRequest(suggestionRequest).Execute()

Suggest a change to a post's text



### Example

```go
package main

import (
	"context"
	"fmt"
	"os"
	openapiclient "github.com/peal-social/peal/packages/peal-sdk/go"
)

func main() {
	workspaceId := "workspaceId_example" // string | 
	suggestionRequest := *openapiclient.NewSuggestionRequest(*openapiclient.NewAssistantAction("Tag_example", openapiclient.AssistantTone("professional"), openapiclient.Platform("x"), openapiclient.TranslationLanguage("en")), "Text_example") // SuggestionRequest | 

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.AssistantAPI.AssistantSuggest(context.Background(), workspaceId).SuggestionRequest(suggestionRequest).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `AssistantAPI.AssistantSuggest``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `AssistantSuggest`: Suggestion
	fmt.Fprintf(os.Stdout, "Response from `AssistantAPI.AssistantSuggest`: %v\n", resp)
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**workspaceId** | **string** |  | 

### Other Parameters

Other parameters are passed through a pointer to a apiAssistantSuggestRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------

 **suggestionRequest** | [**SuggestionRequest**](SuggestionRequest.md) |  | 

### Return type

[**Suggestion**](Suggestion.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)

