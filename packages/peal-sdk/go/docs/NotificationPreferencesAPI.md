# \NotificationPreferencesAPI

All URIs are relative to *https://app.peal.social*

Method | HTTP request | Description
------------- | ------------- | -------------
[**NotificationPreferencesGet**](NotificationPreferencesAPI.md#NotificationPreferencesGet) | **Get** /api/me/notification-preferences | Get notification preferences
[**NotificationPreferencesUpdate**](NotificationPreferencesAPI.md#NotificationPreferencesUpdate) | **Patch** /api/me/notification-preferences | Change notification preferences



## NotificationPreferencesGet

> NotificationPreferences NotificationPreferencesGet(ctx).Execute()

Get notification preferences



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

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.NotificationPreferencesAPI.NotificationPreferencesGet(context.Background()).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `NotificationPreferencesAPI.NotificationPreferencesGet``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `NotificationPreferencesGet`: NotificationPreferences
	fmt.Fprintf(os.Stdout, "Response from `NotificationPreferencesAPI.NotificationPreferencesGet`: %v\n", resp)
}
```

### Path Parameters

This endpoint does not need any parameter.

### Other Parameters

Other parameters are passed through a pointer to a apiNotificationPreferencesGetRequest struct via the builder pattern


### Return type

[**NotificationPreferences**](NotificationPreferences.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## NotificationPreferencesUpdate

> NotificationPreferences NotificationPreferencesUpdate(ctx).NotificationPreferencesChange(notificationPreferencesChange).Execute()

Change notification preferences



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
	notificationPreferencesChange := *openapiclient.NewNotificationPreferencesChange() // NotificationPreferencesChange | 

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.NotificationPreferencesAPI.NotificationPreferencesUpdate(context.Background()).NotificationPreferencesChange(notificationPreferencesChange).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `NotificationPreferencesAPI.NotificationPreferencesUpdate``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `NotificationPreferencesUpdate`: NotificationPreferences
	fmt.Fprintf(os.Stdout, "Response from `NotificationPreferencesAPI.NotificationPreferencesUpdate`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiNotificationPreferencesUpdateRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **notificationPreferencesChange** | [**NotificationPreferencesChange**](NotificationPreferencesChange.md) |  | 

### Return type

[**NotificationPreferences**](NotificationPreferences.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)

