# \TiktokAPI

All URIs are relative to *https://app.peal.social*

Method | HTTP request | Description
------------- | ------------- | -------------
[**TiktokCreator**](TiktokAPI.md#TiktokCreator) | **Get** /api/workspaces/{workspaceId}/channels/{channelId}/tiktok-creator | Read a TikTok channel&#39;s creator



## TiktokCreator

> TikTokAccount TiktokCreator(ctx, channelId, workspaceId).Execute()

Read a TikTok channel's creator



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
	channelId := "channelId_example" // string | 
	workspaceId := "workspaceId_example" // string | 

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.TiktokAPI.TiktokCreator(context.Background(), channelId, workspaceId).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `TiktokAPI.TiktokCreator``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `TiktokCreator`: TikTokAccount
	fmt.Fprintf(os.Stdout, "Response from `TiktokAPI.TiktokCreator`: %v\n", resp)
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**channelId** | **string** |  | 
**workspaceId** | **string** |  | 

### Other Parameters

Other parameters are passed through a pointer to a apiTiktokCreatorRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------



### Return type

[**TikTokAccount**](TikTokAccount.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)

