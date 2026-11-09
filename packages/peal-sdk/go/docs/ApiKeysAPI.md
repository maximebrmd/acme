# \ApiKeysAPI

All URIs are relative to *https://app.peal.social*

Method | HTTP request | Description
------------- | ------------- | -------------
[**ApiKeysCreate**](ApiKeysAPI.md#ApiKeysCreate) | **Post** /api/workspaces/{workspaceId}/api-keys | Create an API key
[**ApiKeysList**](ApiKeysAPI.md#ApiKeysList) | **Get** /api/workspaces/{workspaceId}/api-keys | List API keys
[**ApiKeysRevoke**](ApiKeysAPI.md#ApiKeysRevoke) | **Delete** /api/workspaces/{workspaceId}/api-keys/{apiKeyId} | Revoke an API key



## ApiKeysCreate

> CreatedApiKey ApiKeysCreate(ctx, workspaceId).CreateApiKeyRequest(createApiKeyRequest).Execute()

Create an API key



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
	createApiKeyRequest := *openapiclient.NewCreateApiKeyRequest("Name_example", []openapiclient.Permission{openapiclient.Permission("analytics:read")}) // CreateApiKeyRequest | 

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.ApiKeysAPI.ApiKeysCreate(context.Background(), workspaceId).CreateApiKeyRequest(createApiKeyRequest).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `ApiKeysAPI.ApiKeysCreate``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `ApiKeysCreate`: CreatedApiKey
	fmt.Fprintf(os.Stdout, "Response from `ApiKeysAPI.ApiKeysCreate`: %v\n", resp)
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**workspaceId** | **string** |  | 

### Other Parameters

Other parameters are passed through a pointer to a apiApiKeysCreateRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------

 **createApiKeyRequest** | [**CreateApiKeyRequest**](CreateApiKeyRequest.md) |  | 

### Return type

[**CreatedApiKey**](CreatedApiKey.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## ApiKeysList

> []ApiKey ApiKeysList(ctx, workspaceId).Execute()

List API keys



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
	resp, r, err := apiClient.ApiKeysAPI.ApiKeysList(context.Background(), workspaceId).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `ApiKeysAPI.ApiKeysList``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `ApiKeysList`: []ApiKey
	fmt.Fprintf(os.Stdout, "Response from `ApiKeysAPI.ApiKeysList`: %v\n", resp)
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**workspaceId** | **string** |  | 

### Other Parameters

Other parameters are passed through a pointer to a apiApiKeysListRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------


### Return type

[**[]ApiKey**](ApiKey.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## ApiKeysRevoke

> ApiKeysRevoke(ctx, workspaceId, apiKeyId).Execute()

Revoke an API key



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
	apiKeyId := "apiKeyId_example" // string | 

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	r, err := apiClient.ApiKeysAPI.ApiKeysRevoke(context.Background(), workspaceId, apiKeyId).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `ApiKeysAPI.ApiKeysRevoke``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**workspaceId** | **string** |  | 
**apiKeyId** | **string** |  | 

### Other Parameters

Other parameters are passed through a pointer to a apiApiKeysRevokeRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------



### Return type

 (empty response body)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)

