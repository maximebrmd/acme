# Peal.Api.NoticesApi

All URIs are relative to *https://app.peal.social*

| Method | HTTP request | Description |
|--------|--------------|-------------|
| [**NoticesList**](NoticesApi.md#noticeslist) | **GET** /api/me/notices | List notices |
| [**NoticesMarkAllRead**](NoticesApi.md#noticesmarkallread) | **POST** /api/me/notices/read-all | Mark all notices read |
| [**NoticesMarkRead**](NoticesApi.md#noticesmarkread) | **POST** /api/me/notices/read | Mark notices read |
| [**NoticesUnread**](NoticesApi.md#noticesunread) | **GET** /api/me/notices/unread | Count unread notices |

<a id="noticeslist"></a>
# **NoticesList**
> NoticePage NoticesList (string cursor = null, string limit = null)

List notices

Lists the user's notices, newest first, 20 a page unless `limit` (at most 100) says otherwise. Pass the page's `nextCursor` as `cursor` for the next one. Each notice is data, for the client to write in the reader's language.


### Parameters

| Name | Type | Description | Notes |
|------|------|-------------|-------|
| **cursor** | **string** |  | [optional]  |
| **limit** | **string** |  | [optional]  |

### Return type

[**NoticePage**](NoticePage.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | NoticePage |  -  |
| **400** | BadRequest |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |

[[Back to top]](#) [[Back to API list]](../../README.md#documentation-for-api-endpoints) [[Back to Model list]](../../README.md#documentation-for-models) [[Back to README]](../../README.md)

<a id="noticesmarkallread"></a>
# **NoticesMarkAllRead**
> UnreadNotices NoticesMarkAllRead ()

Mark all notices read

Marks every notice of the user read.


### Parameters
This endpoint does not need any parameter.
### Return type

[**UnreadNotices**](UnreadNotices.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | UnreadNotices |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |

[[Back to top]](#) [[Back to API list]](../../README.md#documentation-for-api-endpoints) [[Back to Model list]](../../README.md#documentation-for-models) [[Back to README]](../../README.md)

<a id="noticesmarkread"></a>
# **NoticesMarkRead**
> UnreadNotices NoticesMarkRead (MarkNoticesRead markNoticesRead)

Mark notices read

Marks up to 100 of the user's notices read, and answers with how many stay unread. Ids that name none of the user's notices, and notices already read, are left as they are.


### Parameters

| Name | Type | Description | Notes |
|------|------|-------------|-------|
| **markNoticesRead** | [**MarkNoticesRead**](MarkNoticesRead.md) |  |  |

### Return type

[**UnreadNotices**](UnreadNotices.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | UnreadNotices |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |

[[Back to top]](#) [[Back to API list]](../../README.md#documentation-for-api-endpoints) [[Back to Model list]](../../README.md#documentation-for-models) [[Back to README]](../../README.md)

<a id="noticesunread"></a>
# **NoticesUnread**
> UnreadNotices NoticesUnread ()

Count unread notices

Counts the user's unread notices.


### Parameters
This endpoint does not need any parameter.
### Return type

[**UnreadNotices**](UnreadNotices.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | UnreadNotices |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |

[[Back to top]](#) [[Back to API list]](../../README.md#documentation-for-api-endpoints) [[Back to Model list]](../../README.md#documentation-for-models) [[Back to README]](../../README.md)

