# Peal.Api.ChannelsApi

All URIs are relative to *https://app.peal.social*

| Method | HTTP request | Description |
|--------|--------------|-------------|
| [**ChannelsChooseAccounts**](ChannelsApi.md#channelschooseaccounts) | **POST** /api/workspaces/{workspaceId}/channels/connect/{platform}/accounts | Choose the accounts to connect |
| [**ChannelsCompleteConnect**](ChannelsApi.md#channelscompleteconnect) | **POST** /api/workspaces/{workspaceId}/channels/connect/{platform}/callback | Complete connecting an account |
| [**ChannelsConnect**](ChannelsApi.md#channelsconnect) | **POST** /api/workspaces/{workspaceId}/channels/connect/{platform} | Start connecting an account |
| [**ChannelsDisconnect**](ChannelsApi.md#channelsdisconnect) | **DELETE** /api/workspaces/{workspaceId}/channels/{channelId} | Disconnect a channel |
| [**ChannelsList**](ChannelsApi.md#channelslist) | **GET** /api/workspaces/{workspaceId}/channels | List channels |
| [**ChannelsPlatforms**](ChannelsApi.md#channelsplatforms) | **GET** /api/workspaces/{workspaceId}/channels/platforms | List connectable platforms |
| [**ChannelsReconnect**](ChannelsApi.md#channelsreconnect) | **POST** /api/workspaces/{workspaceId}/channels/{channelId}/reconnect | Start reconnecting a channel |

<a id="channelschooseaccounts"></a>
# **ChannelsChooseAccounts**
> List&lt;Channel&gt; ChannelsChooseAccounts (string workspaceId, Platform platform, ChooseAccounts chooseAccounts)

Choose the accounts to connect

Connects the accounts the member chose among those a completed sign-in listed: each becomes a channel of the workspace, or reconnects the one it has. The new accounts chosen need room in the workspace's plan, all of them: otherwise none is connected (PlanLimitReached), and the choice can be made again with fewer. Only the member who completed the sign-in can choose, within 15 minutes, and once an account is connected: a choice that failed before connecting any can be made again. Needs channel:connect.


### Parameters

| Name | Type | Description | Notes |
|------|------|-------------|-------|
| **workspaceId** | **string** |  |  |
| **platform** | **Platform** |  |  |
| **chooseAccounts** | [**ChooseAccounts**](ChooseAccounts.md) |  |  |

### Return type

[**List&lt;Channel&gt;**](Channel.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Success |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **402** | The workspace&#39;s plan allows no more of &#x60;limit&#x60;: it has &#x60;allowed&#x60; already. A larger plan, or removing some, makes room. Nothing was changed. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |
| **404** | The workspace has no channel with this id. | No workspace with this id is open to the caller. |  -  |
| **422** | The account was not connected; &#x60;reason&#x60; says why. Nothing was saved. |  -  |
| **502** | The platform did not answer, or failed on its side. Nothing was connected; try again later. |  -  |

[[Back to top]](#) [[Back to API list]](../../README.md#documentation-for-api-endpoints) [[Back to Model list]](../../README.md#documentation-for-models) [[Back to README]](../../README.md)

<a id="channelscompleteconnect"></a>
# **ChannelsCompleteConnect**
> ConnectOutcome ChannelsCompleteConnect (string workspaceId, Platform platform, ConnectCallback connectCallback)

Complete connecting an account

Completes a connection with what the platform sent back: the account becomes a channel of the workspace, or the channel it reconnects takes its new tokens. When the sign-in reached several accounts, as the Pages a Facebook user manages, the answer lists them instead, to choose with chooseAccounts. Only the member who started the connection can complete it, once. A new account needs room in the workspace's plan (PlanLimitReached). Needs channel:connect.


### Parameters

| Name | Type | Description | Notes |
|------|------|-------------|-------|
| **workspaceId** | **string** |  |  |
| **platform** | **Platform** |  |  |
| **connectCallback** | [**ConnectCallback**](ConnectCallback.md) |  |  |

### Return type

[**ConnectOutcome**](ConnectOutcome.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | ConnectOutcome |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **402** | The workspace&#39;s plan allows no more of &#x60;limit&#x60;: it has &#x60;allowed&#x60; already. A larger plan, or removing some, makes room. Nothing was changed. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |
| **404** | The workspace has no channel with this id. | No workspace with this id is open to the caller. |  -  |
| **422** | The account was not connected; &#x60;reason&#x60; says why. Nothing was saved. |  -  |
| **502** | The platform did not answer, or failed on its side. Nothing was connected; try again later. |  -  |

[[Back to top]](#) [[Back to API list]](../../README.md#documentation-for-api-endpoints) [[Back to Model list]](../../README.md#documentation-for-models) [[Back to README]](../../README.md)

<a id="channelsconnect"></a>
# **ChannelsConnect**
> Authorization ChannelsConnect (string workspaceId, Platform platform, ConnectChannel connectChannel)

Start connecting an account

Starts connecting an account of the platform: answers with the platform's sign-in page, where the browser goes next. The connection is tied to the caller and the workspace, and must be completed within 15 minutes. On a server that bills, a workspace whose plan allows no more channels gets PlanLimitReached. Needs channel:connect.


### Parameters

| Name | Type | Description | Notes |
|------|------|-------------|-------|
| **workspaceId** | **string** |  |  |
| **platform** | **Platform** |  |  |
| **connectChannel** | [**ConnectChannel**](ConnectChannel.md) |  |  |

### Return type

[**Authorization**](Authorization.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Authorization |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **402** | The workspace&#39;s plan allows no more of &#x60;limit&#x60;: it has &#x60;allowed&#x60; already. A larger plan, or removing some, makes room. Nothing was changed. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |
| **404** | No workspace with this id is open to the caller. |  -  |
| **422** | The account was not connected; &#x60;reason&#x60; says why. Nothing was saved. |  -  |
| **502** | The platform did not answer, or failed on its side. Nothing was connected; try again later. |  -  |

[[Back to top]](#) [[Back to API list]](../../README.md#documentation-for-api-endpoints) [[Back to Model list]](../../README.md#documentation-for-models) [[Back to README]](../../README.md)

<a id="channelsdisconnect"></a>
# **ChannelsDisconnect**
> void ChannelsDisconnect (string workspaceId, string channelId)

Disconnect a channel

Disconnects a channel from the workspace: the channel and the tokens Peal holds for it are deleted, and nothing more is posted on it. Needs channel:disconnect.


### Parameters

| Name | Type | Description | Notes |
|------|------|-------------|-------|
| **workspaceId** | **string** |  |  |
| **channelId** | **string** |  |  |

### Return type

void (empty response body)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **204** | &lt;No Content&gt; |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |
| **404** | The workspace has no channel with this id. | No workspace with this id is open to the caller. |  -  |

[[Back to top]](#) [[Back to API list]](../../README.md#documentation-for-api-endpoints) [[Back to Model list]](../../README.md#documentation-for-models) [[Back to README]](../../README.md)

<a id="channelslist"></a>
# **ChannelsList**
> List&lt;Channel&gt; ChannelsList (string workspaceId)

List channels

Lists the channels connected to the workspace, oldest first. Their tokens are never shown. Needs channel:read.


### Parameters

| Name | Type | Description | Notes |
|------|------|-------------|-------|
| **workspaceId** | **string** |  |  |

### Return type

[**List&lt;Channel&gt;**](Channel.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Success |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |
| **404** | No workspace with this id is open to the caller. |  -  |

[[Back to top]](#) [[Back to API list]](../../README.md#documentation-for-api-endpoints) [[Back to Model list]](../../README.md#documentation-for-models) [[Back to README]](../../README.md)

<a id="channelsplatforms"></a>
# **ChannelsPlatforms**
> ConnectablePlatforms ChannelsPlatforms (string workspaceId)

List connectable platforms

Lists the platforms this server can connect accounts of, in Peal's order. A platform that needs a setting the server lacks, such as an app registered on LinkedIn, X or Meta or a Google OAuth client, is left out. Needs channel:connect.


### Parameters

| Name | Type | Description | Notes |
|------|------|-------------|-------|
| **workspaceId** | **string** |  |  |

### Return type

[**ConnectablePlatforms**](ConnectablePlatforms.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | ConnectablePlatforms |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |
| **404** | No workspace with this id is open to the caller. |  -  |

[[Back to top]](#) [[Back to API list]](../../README.md#documentation-for-api-endpoints) [[Back to Model list]](../../README.md#documentation-for-models) [[Back to README]](../../README.md)

<a id="channelsreconnect"></a>
# **ChannelsReconnect**
> Authorization ChannelsReconnect (string workspaceId, string channelId)

Start reconnecting a channel

Starts reconnecting a channel whose token stopped working or is about to: answers with the platform's sign-in page. Completing it must sign in to the same account. A channel the workspace has takes no room in its plan, so no plan limit refuses it. Needs channel:connect.


### Parameters

| Name | Type | Description | Notes |
|------|------|-------------|-------|
| **workspaceId** | **string** |  |  |
| **channelId** | **string** |  |  |

### Return type

[**Authorization**](Authorization.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Authorization |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |
| **404** | The workspace has no channel with this id. | No workspace with this id is open to the caller. |  -  |
| **422** | The account was not connected; &#x60;reason&#x60; says why. Nothing was saved. |  -  |
| **502** | The platform did not answer, or failed on its side. Nothing was connected; try again later. |  -  |

[[Back to top]](#) [[Back to API list]](../../README.md#documentation-for-api-endpoints) [[Back to Model list]](../../README.md#documentation-for-models) [[Back to README]](../../README.md)

