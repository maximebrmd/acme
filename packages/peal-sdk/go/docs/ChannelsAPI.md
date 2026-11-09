# \ChannelsAPI

All URIs are relative to *https://app.peal.social*

Method | HTTP request | Description
------------- | ------------- | -------------
[**ChannelsChooseAccounts**](ChannelsAPI.md#ChannelsChooseAccounts) | **Post** /api/workspaces/{workspaceId}/channels/connect/{platform}/accounts | Choose the accounts to connect
[**ChannelsCompleteConnect**](ChannelsAPI.md#ChannelsCompleteConnect) | **Post** /api/workspaces/{workspaceId}/channels/connect/{platform}/callback | Complete connecting an account
[**ChannelsConnect**](ChannelsAPI.md#ChannelsConnect) | **Post** /api/workspaces/{workspaceId}/channels/connect/{platform} | Start connecting an account
[**ChannelsDisconnect**](ChannelsAPI.md#ChannelsDisconnect) | **Delete** /api/workspaces/{workspaceId}/channels/{channelId} | Disconnect a channel
[**ChannelsList**](ChannelsAPI.md#ChannelsList) | **Get** /api/workspaces/{workspaceId}/channels | List channels
[**ChannelsPlatforms**](ChannelsAPI.md#ChannelsPlatforms) | **Get** /api/workspaces/{workspaceId}/channels/platforms | List connectable platforms
[**ChannelsReconnect**](ChannelsAPI.md#ChannelsReconnect) | **Post** /api/workspaces/{workspaceId}/channels/{channelId}/reconnect | Start reconnecting a channel



## ChannelsChooseAccounts

> []Channel ChannelsChooseAccounts(ctx, workspaceId, platform).ChooseAccounts(chooseAccounts).Execute()

Choose the accounts to connect



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
	platform := openapiclient.Platform("x") // Platform | 
	chooseAccounts := *openapiclient.NewChooseAccounts([]string{"AccountIds_example"}, "Selection_example") // ChooseAccounts | 

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.ChannelsAPI.ChannelsChooseAccounts(context.Background(), workspaceId, platform).ChooseAccounts(chooseAccounts).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `ChannelsAPI.ChannelsChooseAccounts``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `ChannelsChooseAccounts`: []Channel
	fmt.Fprintf(os.Stdout, "Response from `ChannelsAPI.ChannelsChooseAccounts`: %v\n", resp)
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**workspaceId** | **string** |  | 
**platform** | [**Platform**](.md) |  | 

### Other Parameters

Other parameters are passed through a pointer to a apiChannelsChooseAccountsRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------


 **chooseAccounts** | [**ChooseAccounts**](ChooseAccounts.md) |  | 

### Return type

[**[]Channel**](Channel.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## ChannelsCompleteConnect

> ConnectOutcome ChannelsCompleteConnect(ctx, workspaceId, platform).ConnectCallback(connectCallback).Execute()

Complete connecting an account



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
	platform := openapiclient.Platform("x") // Platform | 
	connectCallback := *openapiclient.NewConnectCallback("State_example") // ConnectCallback | 

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.ChannelsAPI.ChannelsCompleteConnect(context.Background(), workspaceId, platform).ConnectCallback(connectCallback).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `ChannelsAPI.ChannelsCompleteConnect``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `ChannelsCompleteConnect`: ConnectOutcome
	fmt.Fprintf(os.Stdout, "Response from `ChannelsAPI.ChannelsCompleteConnect`: %v\n", resp)
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**workspaceId** | **string** |  | 
**platform** | [**Platform**](.md) |  | 

### Other Parameters

Other parameters are passed through a pointer to a apiChannelsCompleteConnectRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------


 **connectCallback** | [**ConnectCallback**](ConnectCallback.md) |  | 

### Return type

[**ConnectOutcome**](ConnectOutcome.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## ChannelsConnect

> Authorization ChannelsConnect(ctx, workspaceId, platform).ConnectChannel(connectChannel).Execute()

Start connecting an account



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
	platform := openapiclient.Platform("x") // Platform | 
	connectChannel := *openapiclient.NewConnectChannel() // ConnectChannel | 

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.ChannelsAPI.ChannelsConnect(context.Background(), workspaceId, platform).ConnectChannel(connectChannel).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `ChannelsAPI.ChannelsConnect``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `ChannelsConnect`: Authorization
	fmt.Fprintf(os.Stdout, "Response from `ChannelsAPI.ChannelsConnect`: %v\n", resp)
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**workspaceId** | **string** |  | 
**platform** | [**Platform**](.md) |  | 

### Other Parameters

Other parameters are passed through a pointer to a apiChannelsConnectRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------


 **connectChannel** | [**ConnectChannel**](ConnectChannel.md) |  | 

### Return type

[**Authorization**](Authorization.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## ChannelsDisconnect

> ChannelsDisconnect(ctx, workspaceId, channelId).Execute()

Disconnect a channel



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
	channelId := "channelId_example" // string | 

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	r, err := apiClient.ChannelsAPI.ChannelsDisconnect(context.Background(), workspaceId, channelId).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `ChannelsAPI.ChannelsDisconnect``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**workspaceId** | **string** |  | 
**channelId** | **string** |  | 

### Other Parameters

Other parameters are passed through a pointer to a apiChannelsDisconnectRequest struct via the builder pattern


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


## ChannelsList

> []Channel ChannelsList(ctx, workspaceId).Execute()

List channels



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
	resp, r, err := apiClient.ChannelsAPI.ChannelsList(context.Background(), workspaceId).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `ChannelsAPI.ChannelsList``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `ChannelsList`: []Channel
	fmt.Fprintf(os.Stdout, "Response from `ChannelsAPI.ChannelsList`: %v\n", resp)
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**workspaceId** | **string** |  | 

### Other Parameters

Other parameters are passed through a pointer to a apiChannelsListRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------


### Return type

[**[]Channel**](Channel.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## ChannelsPlatforms

> ConnectablePlatforms ChannelsPlatforms(ctx, workspaceId).Execute()

List connectable platforms



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
	resp, r, err := apiClient.ChannelsAPI.ChannelsPlatforms(context.Background(), workspaceId).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `ChannelsAPI.ChannelsPlatforms``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `ChannelsPlatforms`: ConnectablePlatforms
	fmt.Fprintf(os.Stdout, "Response from `ChannelsAPI.ChannelsPlatforms`: %v\n", resp)
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**workspaceId** | **string** |  | 

### Other Parameters

Other parameters are passed through a pointer to a apiChannelsPlatformsRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------


### Return type

[**ConnectablePlatforms**](ConnectablePlatforms.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## ChannelsReconnect

> Authorization ChannelsReconnect(ctx, workspaceId, channelId).Execute()

Start reconnecting a channel



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
	channelId := "channelId_example" // string | 

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.ChannelsAPI.ChannelsReconnect(context.Background(), workspaceId, channelId).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `ChannelsAPI.ChannelsReconnect``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `ChannelsReconnect`: Authorization
	fmt.Fprintf(os.Stdout, "Response from `ChannelsAPI.ChannelsReconnect`: %v\n", resp)
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**workspaceId** | **string** |  | 
**channelId** | **string** |  | 

### Other Parameters

Other parameters are passed through a pointer to a apiChannelsReconnectRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------



### Return type

[**Authorization**](Authorization.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)

