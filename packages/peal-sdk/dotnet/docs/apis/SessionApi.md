# Peal.Api.SessionApi

All URIs are relative to *https://app.peal.social*

| Method | HTTP request | Description |
|--------|--------------|-------------|
| [**SessionMe**](SessionApi.md#sessionme) | **GET** /api/me | Get the signed-in user |

<a id="sessionme"></a>
# **SessionMe**
> Me SessionMe ()

Get the signed-in user

Answers with the signed-in user and every workspace they belong to, with their role and permissions in each. API keys belong to a workspace, not a user, and get 403.


### Parameters
This endpoint does not need any parameter.
### Return type

[**Me**](Me.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Me |  -  |
| **401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
| **403** | The credentials are valid but do not allow this request. |  -  |

[[Back to top]](#) [[Back to API list]](../../README.md#documentation-for-api-endpoints) [[Back to Model list]](../../README.md#documentation-for-models) [[Back to README]](../../README.md)

