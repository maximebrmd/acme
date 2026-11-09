# \AnalyticsAPI

All URIs are relative to *https://app.peal.social*

Method | HTTP request | Description
------------- | ------------- | -------------
[**AnalyticsPost**](AnalyticsAPI.md#AnalyticsPost) | **Get** /api/workspaces/{workspaceId}/analytics/posts/{postId} | Get a post&#39;s analytics
[**AnalyticsSummary**](AnalyticsAPI.md#AnalyticsSummary) | **Get** /api/workspaces/{workspaceId}/analytics/summary | Summarize the workspace&#39;s analytics



## AnalyticsPost

> PostAnalytics AnalyticsPost(ctx, workspaceId, postId).Execute()

Get a post's analytics



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
	postId := "postId_example" // string | 

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.AnalyticsAPI.AnalyticsPost(context.Background(), workspaceId, postId).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `AnalyticsAPI.AnalyticsPost``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `AnalyticsPost`: PostAnalytics
	fmt.Fprintf(os.Stdout, "Response from `AnalyticsAPI.AnalyticsPost`: %v\n", resp)
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**workspaceId** | **string** |  | 
**postId** | **string** |  | 

### Other Parameters

Other parameters are passed through a pointer to a apiAnalyticsPostRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------



### Return type

[**PostAnalytics**](PostAnalytics.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## AnalyticsSummary

> AnalyticsSummary AnalyticsSummary(ctx, workspaceId).From(from).TimeZone(timeZone).To(to).Execute()

Summarize the workspace's analytics



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
	from := "from_example" // string | 
	timeZone := "timeZone_example" // string | 
	to := "to_example" // string | 

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.AnalyticsAPI.AnalyticsSummary(context.Background(), workspaceId).From(from).TimeZone(timeZone).To(to).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `AnalyticsAPI.AnalyticsSummary``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `AnalyticsSummary`: AnalyticsSummary
	fmt.Fprintf(os.Stdout, "Response from `AnalyticsAPI.AnalyticsSummary`: %v\n", resp)
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**workspaceId** | **string** |  | 

### Other Parameters

Other parameters are passed through a pointer to a apiAnalyticsSummaryRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------

 **from** | **string** |  | 
 **timeZone** | **string** |  | 
 **to** | **string** |  | 

### Return type

[**AnalyticsSummary**](AnalyticsSummary.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)

