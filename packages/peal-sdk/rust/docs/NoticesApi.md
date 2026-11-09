# \NoticesApi

All URIs are relative to *https://app.peal.social*

Method | HTTP request | Description
------------- | ------------- | -------------
[**notices_list**](NoticesApi.md#notices_list) | **GET** /api/me/notices | List notices
[**notices_mark_all_read**](NoticesApi.md#notices_mark_all_read) | **POST** /api/me/notices/read-all | Mark all notices read
[**notices_mark_read**](NoticesApi.md#notices_mark_read) | **POST** /api/me/notices/read | Mark notices read
[**notices_unread**](NoticesApi.md#notices_unread) | **GET** /api/me/notices/unread | Count unread notices



## notices_list

> models::NoticePage notices_list(cursor, limit)
List notices

Lists the user's notices, newest first, 20 a page unless `limit` (at most 100) says otherwise. Pass the page's `nextCursor` as `cursor` for the next one. Each notice is data, for the client to write in the reader's language.

### Parameters


Name | Type | Description  | Required | Notes
------------- | ------------- | ------------- | ------------- | -------------
**cursor** | Option<**String**> |  |  |
**limit** | Option<**String**> |  |  |

### Return type

[**models::NoticePage**](NoticePage.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)


## notices_mark_all_read

> models::UnreadNotices notices_mark_all_read()
Mark all notices read

Marks every notice of the user read.

### Parameters

This endpoint does not need any parameter.

### Return type

[**models::UnreadNotices**](UnreadNotices.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)


## notices_mark_read

> models::UnreadNotices notices_mark_read(mark_notices_read)
Mark notices read

Marks up to 100 of the user's notices read, and answers with how many stay unread. Ids that name none of the user's notices, and notices already read, are left as they are.

### Parameters


Name | Type | Description  | Required | Notes
------------- | ------------- | ------------- | ------------- | -------------
**mark_notices_read** | [**MarkNoticesRead**](MarkNoticesRead.md) |  | [required] |

### Return type

[**models::UnreadNotices**](UnreadNotices.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)


## notices_unread

> models::UnreadNotices notices_unread()
Count unread notices

Counts the user's unread notices.

### Parameters

This endpoint does not need any parameter.

### Return type

[**models::UnreadNotices**](UnreadNotices.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

