# \MediaApi

All URIs are relative to *https://app.peal.social*

Method | HTTP request | Description
------------- | ------------- | -------------
[**media_complete**](MediaApi.md#media_complete) | **POST** /api/workspaces/{workspaceId}/media/{mediaId}/complete | Complete an upload
[**media_create**](MediaApi.md#media_create) | **POST** /api/workspaces/{workspaceId}/media | Start an upload
[**media_delete**](MediaApi.md#media_delete) | **DELETE** /api/workspaces/{workspaceId}/media/{mediaId} | Delete media
[**media_describe**](MediaApi.md#media_describe) | **PATCH** /api/workspaces/{workspaceId}/media/{mediaId} | Describe media
[**media_get**](MediaApi.md#media_get) | **GET** /api/workspaces/{workspaceId}/media/{mediaId} | Get media
[**media_list**](MediaApi.md#media_list) | **GET** /api/workspaces/{workspaceId}/media | List media
[**media_usage**](MediaApi.md#media_usage) | **GET** /api/workspaces/{workspaceId}/media/{mediaId}/usage | Get where media is used



## media_complete

> models::Media media_complete(workspace_id, media_id)
Complete an upload

Checks that the file reached the store with the declared size and type, joining its parts first, then probes it: the media is ready, or stays uploaded with why it could not be probed. Calling it again is safe, and probes an uploaded file again. Needs media:upload.

### Parameters


Name | Type | Description  | Required | Notes
------------- | ------------- | ------------- | ------------- | -------------
**workspace_id** | **String** |  | [required] |
**media_id** | **String** |  | [required] |

### Return type

[**models::Media**](Media.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)


## media_create

> models::PreparedUpload media_create(workspace_id, new_upload)
Start an upload

Records pending media and signs the upload of its file: one PUT for an image or a video up to 16 MiB, one PUT per part for a larger video. Send the file with them, then complete the upload. The requests only take the declared size and content type. On a server that bills, the declared size must fit the plan's media storage with what the workspace stores (PlanLimitReached `mediaStorage`). Needs media:upload.

### Parameters


Name | Type | Description  | Required | Notes
------------- | ------------- | ------------- | ------------- | -------------
**workspace_id** | **String** |  | [required] |
**new_upload** | [**NewUpload**](NewUpload.md) |  | [required] |

### Return type

[**models::PreparedUpload**](PreparedUpload.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)


## media_delete

> media_delete(workspace_id, media_id)
Delete media

Deletes the media and its file, and cancels its upload if it is still pending. Drafts that show it lose it. Posts scheduled or publishing that show it refuse the deletion (`MediaInUse`, listing them): take them back to draft first. Needs media:delete.

### Parameters


Name | Type | Description  | Required | Notes
------------- | ------------- | ------------- | ------------- | -------------
**workspace_id** | **String** |  | [required] |
**media_id** | **String** |  | [required] |

### Return type

 (empty response body)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)


## media_describe

> models::Media media_describe(workspace_id, media_id, media_description)
Describe media

Sets the media's description, which platforms show to people who cannot see it. It can be written while the file uploads. Needs media:upload.

### Parameters


Name | Type | Description  | Required | Notes
------------- | ------------- | ------------- | ------------- | -------------
**workspace_id** | **String** |  | [required] |
**media_id** | **String** |  | [required] |
**media_description** | [**MediaDescription**](MediaDescription.md) |  | [required] |

### Return type

[**models::Media**](Media.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)


## media_get

> models::Media media_get(workspace_id, media_id)
Get media

Shows one of the workspace's media. Needs media:read.

### Parameters


Name | Type | Description  | Required | Notes
------------- | ------------- | ------------- | ------------- | -------------
**workspace_id** | **String** |  | [required] |
**media_id** | **String** |  | [required] |

### Return type

[**models::Media**](Media.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)


## media_list

> models::MediaPage media_list(workspace_id, cursor, limit)
List media

Lists the workspace's media, newest first, 30 a page unless `limit` (at most 100) says otherwise. Pass the page's `nextCursor` as `cursor` for the next one. Needs media:read.

### Parameters


Name | Type | Description  | Required | Notes
------------- | ------------- | ------------- | ------------- | -------------
**workspace_id** | **String** |  | [required] |
**cursor** | Option<**String**> |  |  |
**limit** | Option<**String**> |  |  |

### Return type

[**models::MediaPage**](MediaPage.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)


## media_usage

> models::MediaUsage media_usage(workspace_id, media_id)
Get where media is used

Lists the posts that show the media: drafts, which lose it if it is deleted, and posts scheduled or publishing, which keep it from being deleted. Needs media:read.

### Parameters


Name | Type | Description  | Required | Notes
------------- | ------------- | ------------- | ------------- | -------------
**workspace_id** | **String** |  | [required] |
**media_id** | **String** |  | [required] |

### Return type

[**models::MediaUsage**](MediaUsage.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

