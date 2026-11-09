# Peal.Api.TiktokApi

All URIs are relative to *https://app.peal.social*

| Method | HTTP request | Description |
|--------|--------------|-------------|
| [**TiktokCreator**](TiktokApi.md#tiktokcreator) | **GET** /api/workspaces/{workspaceId}/channels/{channelId}/tiktok-creator | Read a TikTok channel&#39;s creator |

<a id="tiktokcreator"></a>
# **TiktokCreator**
> TikTokAccount TiktokCreator (string channelId, string workspaceId)

Read a TikTok channel's creator

Reads a TikTok channel's creator from TikTok: their nickname, the audiences the account offers, the interactions they turned off and the longest video they may post, or why they cannot post now. A channel that is not TikTok's is ChannelNotFound. Needs post:create.


### Parameters

| Name | Type | Description | Notes |
|------|------|-------------|-------|
| **channelId** | **string** |  |  |
| **workspaceId** | **string** |  |  |

### Return type

[**TikTokAccount**](TikTokAccount.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | TikTokAccount |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |
| **404** | The workspace has no channel with this id. | No workspace with this id is open to the caller. |  -  |
| **409** | The channel cannot post now: it is turned off (&#x60;disabled&#x60;), or its account must be reconnected (&#x60;reconnect&#x60;). |  -  |
| **502** | The platform did not answer, or failed on its side. Nothing was connected; try again later. |  -  |

[[Back to top]](#) [[Back to API list]](../../README.md#documentation-for-api-endpoints) [[Back to Model list]](../../README.md#documentation-for-models) [[Back to README]](../../README.md)

