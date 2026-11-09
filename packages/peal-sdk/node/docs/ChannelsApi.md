# ChannelsApi

All URIs are relative to *https://app.peal.social*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**channelsChooseAccounts**](ChannelsApi.md#channelschooseaccounts) | **POST** /api/workspaces/{workspaceId}/channels/connect/{platform}/accounts | Choose the accounts to connect |
| [**channelsCompleteConnect**](ChannelsApi.md#channelscompleteconnect) | **POST** /api/workspaces/{workspaceId}/channels/connect/{platform}/callback | Complete connecting an account |
| [**channelsConnect**](ChannelsApi.md#channelsconnect) | **POST** /api/workspaces/{workspaceId}/channels/connect/{platform} | Start connecting an account |
| [**channelsDisconnect**](ChannelsApi.md#channelsdisconnect) | **DELETE** /api/workspaces/{workspaceId}/channels/{channelId} | Disconnect a channel |
| [**channelsList**](ChannelsApi.md#channelslist) | **GET** /api/workspaces/{workspaceId}/channels | List channels |
| [**channelsPlatforms**](ChannelsApi.md#channelsplatforms) | **GET** /api/workspaces/{workspaceId}/channels/platforms | List connectable platforms |
| [**channelsReconnect**](ChannelsApi.md#channelsreconnect) | **POST** /api/workspaces/{workspaceId}/channels/{channelId}/reconnect | Start reconnecting a channel |



## channelsChooseAccounts

> Array&lt;Channel&gt; channelsChooseAccounts(workspaceId, platform, chooseAccounts)

Choose the accounts to connect

Connects the accounts the member chose among those a completed sign-in listed: each becomes a channel of the workspace, or reconnects the one it has. The new accounts chosen need room in the workspace\&#39;s plan, all of them: otherwise none is connected (PlanLimitReached), and the choice can be made again with fewer. Only the member who completed the sign-in can choose, within 15 minutes, and once an account is connected: a choice that failed before connecting any can be made again. Needs channel:connect.

### Example

```ts
import {
  Configuration,
  ChannelsApi,
} from 'peal';
import type { ChannelsChooseAccountsRequest } from 'peal';

async function example() {
  console.log("🚀 Testing peal SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new ChannelsApi(config);

  const body = {
    // string
    workspaceId: workspaceId_example,
    // Platform
    platform: ...,
    // ChooseAccounts
    chooseAccounts: ...,
  } satisfies ChannelsChooseAccountsRequest;

  try {
    const data = await api.channelsChooseAccounts(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **workspaceId** | `string` |  | [Defaults to `undefined`] |
| **platform** | `Platform` |  | [Defaults to `undefined`] [Enum: x, linkedin, bluesky, mastodon, threads, instagram, facebook, tiktok, youtube, pinterest] |
| **chooseAccounts** | [ChooseAccounts](ChooseAccounts.md) |  | |

### Return type

[**Array&lt;Channel&gt;**](Channel.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Success |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **402** | The workspace\&#39;s plan allows no more of &#x60;limit&#x60;: it has &#x60;allowed&#x60; already. A larger plan, or removing some, makes room. Nothing was changed. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |
| **404** | The workspace has no channel with this id. | No workspace with this id is open to the caller. |  -  |
| **422** | The account was not connected; &#x60;reason&#x60; says why. Nothing was saved. |  -  |
| **502** | The platform did not answer, or failed on its side. Nothing was connected; try again later. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## channelsCompleteConnect

> ConnectOutcome channelsCompleteConnect(workspaceId, platform, connectCallback)

Complete connecting an account

Completes a connection with what the platform sent back: the account becomes a channel of the workspace, or the channel it reconnects takes its new tokens. When the sign-in reached several accounts, as the Pages a Facebook user manages, the answer lists them instead, to choose with chooseAccounts. Only the member who started the connection can complete it, once. A new account needs room in the workspace\&#39;s plan (PlanLimitReached). Needs channel:connect.

### Example

```ts
import {
  Configuration,
  ChannelsApi,
} from 'peal';
import type { ChannelsCompleteConnectRequest } from 'peal';

async function example() {
  console.log("🚀 Testing peal SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new ChannelsApi(config);

  const body = {
    // string
    workspaceId: workspaceId_example,
    // Platform
    platform: ...,
    // ConnectCallback
    connectCallback: ...,
  } satisfies ChannelsCompleteConnectRequest;

  try {
    const data = await api.channelsCompleteConnect(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **workspaceId** | `string` |  | [Defaults to `undefined`] |
| **platform** | `Platform` |  | [Defaults to `undefined`] [Enum: x, linkedin, bluesky, mastodon, threads, instagram, facebook, tiktok, youtube, pinterest] |
| **connectCallback** | [ConnectCallback](ConnectCallback.md) |  | |

### Return type

[**ConnectOutcome**](ConnectOutcome.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | ConnectOutcome |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **402** | The workspace\&#39;s plan allows no more of &#x60;limit&#x60;: it has &#x60;allowed&#x60; already. A larger plan, or removing some, makes room. Nothing was changed. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |
| **404** | The workspace has no channel with this id. | No workspace with this id is open to the caller. |  -  |
| **422** | The account was not connected; &#x60;reason&#x60; says why. Nothing was saved. |  -  |
| **502** | The platform did not answer, or failed on its side. Nothing was connected; try again later. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## channelsConnect

> Authorization channelsConnect(workspaceId, platform, connectChannel)

Start connecting an account

Starts connecting an account of the platform: answers with the platform\&#39;s sign-in page, where the browser goes next. The connection is tied to the caller and the workspace, and must be completed within 15 minutes. On a server that bills, a workspace whose plan allows no more channels gets PlanLimitReached. Needs channel:connect.

### Example

```ts
import {
  Configuration,
  ChannelsApi,
} from 'peal';
import type { ChannelsConnectRequest } from 'peal';

async function example() {
  console.log("🚀 Testing peal SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new ChannelsApi(config);

  const body = {
    // string
    workspaceId: workspaceId_example,
    // Platform
    platform: ...,
    // ConnectChannel
    connectChannel: ...,
  } satisfies ChannelsConnectRequest;

  try {
    const data = await api.channelsConnect(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **workspaceId** | `string` |  | [Defaults to `undefined`] |
| **platform** | `Platform` |  | [Defaults to `undefined`] [Enum: x, linkedin, bluesky, mastodon, threads, instagram, facebook, tiktok, youtube, pinterest] |
| **connectChannel** | [ConnectChannel](ConnectChannel.md) |  | |

### Return type

[**Authorization**](Authorization.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Authorization |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **402** | The workspace\&#39;s plan allows no more of &#x60;limit&#x60;: it has &#x60;allowed&#x60; already. A larger plan, or removing some, makes room. Nothing was changed. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |
| **404** | No workspace with this id is open to the caller. |  -  |
| **422** | The account was not connected; &#x60;reason&#x60; says why. Nothing was saved. |  -  |
| **502** | The platform did not answer, or failed on its side. Nothing was connected; try again later. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## channelsDisconnect

> channelsDisconnect(workspaceId, channelId)

Disconnect a channel

Disconnects a channel from the workspace: the channel and the tokens Peal holds for it are deleted, and nothing more is posted on it. Needs channel:disconnect.

### Example

```ts
import {
  Configuration,
  ChannelsApi,
} from 'peal';
import type { ChannelsDisconnectRequest } from 'peal';

async function example() {
  console.log("🚀 Testing peal SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new ChannelsApi(config);

  const body = {
    // string
    workspaceId: workspaceId_example,
    // string
    channelId: channelId_example,
  } satisfies ChannelsDisconnectRequest;

  try {
    const data = await api.channelsDisconnect(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **workspaceId** | `string` |  | [Defaults to `undefined`] |
| **channelId** | `string` |  | [Defaults to `undefined`] |

### Return type

`void` (Empty response body)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **204** | &lt;No Content&gt; |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |
| **404** | The workspace has no channel with this id. | No workspace with this id is open to the caller. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## channelsList

> Array&lt;Channel&gt; channelsList(workspaceId)

List channels

Lists the channels connected to the workspace, oldest first. Their tokens are never shown. Needs channel:read.

### Example

```ts
import {
  Configuration,
  ChannelsApi,
} from 'peal';
import type { ChannelsListRequest } from 'peal';

async function example() {
  console.log("🚀 Testing peal SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new ChannelsApi(config);

  const body = {
    // string
    workspaceId: workspaceId_example,
  } satisfies ChannelsListRequest;

  try {
    const data = await api.channelsList(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **workspaceId** | `string` |  | [Defaults to `undefined`] |

### Return type

[**Array&lt;Channel&gt;**](Channel.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Success |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |
| **404** | No workspace with this id is open to the caller. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## channelsPlatforms

> ConnectablePlatforms channelsPlatforms(workspaceId)

List connectable platforms

Lists the platforms this server can connect accounts of, in Peal\&#39;s order. A platform that needs a setting the server lacks, such as an app registered on LinkedIn, X or Meta or a Google OAuth client, is left out. Needs channel:connect.

### Example

```ts
import {
  Configuration,
  ChannelsApi,
} from 'peal';
import type { ChannelsPlatformsRequest } from 'peal';

async function example() {
  console.log("🚀 Testing peal SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new ChannelsApi(config);

  const body = {
    // string
    workspaceId: workspaceId_example,
  } satisfies ChannelsPlatformsRequest;

  try {
    const data = await api.channelsPlatforms(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **workspaceId** | `string` |  | [Defaults to `undefined`] |

### Return type

[**ConnectablePlatforms**](ConnectablePlatforms.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | ConnectablePlatforms |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |
| **404** | No workspace with this id is open to the caller. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## channelsReconnect

> Authorization channelsReconnect(workspaceId, channelId)

Start reconnecting a channel

Starts reconnecting a channel whose token stopped working or is about to: answers with the platform\&#39;s sign-in page. Completing it must sign in to the same account. A channel the workspace has takes no room in its plan, so no plan limit refuses it. Needs channel:connect.

### Example

```ts
import {
  Configuration,
  ChannelsApi,
} from 'peal';
import type { ChannelsReconnectRequest } from 'peal';

async function example() {
  console.log("🚀 Testing peal SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new ChannelsApi(config);

  const body = {
    // string
    workspaceId: workspaceId_example,
    // string
    channelId: channelId_example,
  } satisfies ChannelsReconnectRequest;

  try {
    const data = await api.channelsReconnect(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **workspaceId** | `string` |  | [Defaults to `undefined`] |
| **channelId** | `string` |  | [Defaults to `undefined`] |

### Return type

[**Authorization**](Authorization.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Authorization |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |
| **404** | The workspace has no channel with this id. | No workspace with this id is open to the caller. |  -  |
| **422** | The account was not connected; &#x60;reason&#x60; says why. Nothing was saved. |  -  |
| **502** | The platform did not answer, or failed on its side. Nothing was connected; try again later. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

