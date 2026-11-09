# \NoticesAPI

All URIs are relative to *https://app.peal.social*

Method | HTTP request | Description
------------- | ------------- | -------------
[**NoticesList**](NoticesAPI.md#NoticesList) | **Get** /api/me/notices | List notices
[**NoticesMarkAllRead**](NoticesAPI.md#NoticesMarkAllRead) | **Post** /api/me/notices/read-all | Mark all notices read
[**NoticesMarkRead**](NoticesAPI.md#NoticesMarkRead) | **Post** /api/me/notices/read | Mark notices read
[**NoticesUnread**](NoticesAPI.md#NoticesUnread) | **Get** /api/me/notices/unread | Count unread notices



## NoticesList

> NoticePage NoticesList(ctx).Cursor(cursor).Limit(limit).Execute()

List notices



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
	cursor := "cursor_example" // string |  (optional)
	limit := "limit_example" // string |  (optional)

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.NoticesAPI.NoticesList(context.Background()).Cursor(cursor).Limit(limit).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `NoticesAPI.NoticesList``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `NoticesList`: NoticePage
	fmt.Fprintf(os.Stdout, "Response from `NoticesAPI.NoticesList`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiNoticesListRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **cursor** | **string** |  | 
 **limit** | **string** |  | 

### Return type

[**NoticePage**](NoticePage.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## NoticesMarkAllRead

> UnreadNotices NoticesMarkAllRead(ctx).Execute()

Mark all notices read



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
	resp, r, err := apiClient.NoticesAPI.NoticesMarkAllRead(context.Background()).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `NoticesAPI.NoticesMarkAllRead``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `NoticesMarkAllRead`: UnreadNotices
	fmt.Fprintf(os.Stdout, "Response from `NoticesAPI.NoticesMarkAllRead`: %v\n", resp)
}
```

### Path Parameters

This endpoint does not need any parameter.

### Other Parameters

Other parameters are passed through a pointer to a apiNoticesMarkAllReadRequest struct via the builder pattern


### Return type

[**UnreadNotices**](UnreadNotices.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## NoticesMarkRead

> UnreadNotices NoticesMarkRead(ctx).MarkNoticesRead(markNoticesRead).Execute()

Mark notices read



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
	markNoticesRead := *openapiclient.NewMarkNoticesRead([]string{"Ids_example"}) // MarkNoticesRead | 

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.NoticesAPI.NoticesMarkRead(context.Background()).MarkNoticesRead(markNoticesRead).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `NoticesAPI.NoticesMarkRead``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `NoticesMarkRead`: UnreadNotices
	fmt.Fprintf(os.Stdout, "Response from `NoticesAPI.NoticesMarkRead`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiNoticesMarkReadRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **markNoticesRead** | [**MarkNoticesRead**](MarkNoticesRead.md) |  | 

### Return type

[**UnreadNotices**](UnreadNotices.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## NoticesUnread

> UnreadNotices NoticesUnread(ctx).Execute()

Count unread notices



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
	resp, r, err := apiClient.NoticesAPI.NoticesUnread(context.Background()).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `NoticesAPI.NoticesUnread``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `NoticesUnread`: UnreadNotices
	fmt.Fprintf(os.Stdout, "Response from `NoticesAPI.NoticesUnread`: %v\n", resp)
}
```

### Path Parameters

This endpoint does not need any parameter.

### Other Parameters

Other parameters are passed through a pointer to a apiNoticesUnreadRequest struct via the builder pattern


### Return type

[**UnreadNotices**](UnreadNotices.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)

