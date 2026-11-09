# peal.SessionApi

All URIs are relative to *https://app.peal.social*

Method | HTTP request | Description
------------- | ------------- | -------------
[**session_me**](SessionApi.md#session_me) | **GET** /api/me | Get the signed-in user


# **session_me**
> Me session_me()

Get the signed-in user

Answers with the signed-in user and every workspace they belong to, with their role and permissions in each. API keys belong to a workspace, not a user, and get 403.

### Example

* Bearer Authentication (bearer):

```python
import peal
from peal.models.me import Me
from peal.rest import ApiException
from pprint import pprint

# Defining the host is optional and defaults to https://app.peal.social
# See configuration.py for a list of all supported configuration parameters.
configuration = peal.Configuration(
    host = "https://app.peal.social"
)

# The client must configure the authentication and authorization parameters
# in accordance with the API server security policy.
# Examples for each auth method are provided below, use the example that
# satisfies your auth use case.

# Configure Bearer authorization: bearer
configuration = peal.Configuration(
    access_token = os.environ["BEARER_TOKEN"]
)

# Enter a context with an instance of the API client
with peal.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = peal.SessionApi(api_client)

    try:
        # Get the signed-in user
        api_response = api_instance.session_me()
        print("The response of SessionApi->session_me:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling SessionApi->session_me: %s\n" % e)
```



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
**200** | Me |  -  |
**401** | Sign in, or send an API key as a bearer token: the request has no valid credentials. |  -  |
**403** | The credentials are valid but do not allow this request. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

