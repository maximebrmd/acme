# SystemApi

All URIs are relative to *https://app.peal.social*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**health**](SystemApi.md#health) | **GET** /api/health | Check that the server is up |
| [**ready**](SystemApi.md#ready) | **GET** /api/ready | Check that the server can take traffic |


<a id="health"></a>
# **health**
> health()

Check that the server is up

Answers as soon as the server is up, whatever the state of its database. Use it as a liveness or container health check.

### Example
```java
// Import classes:
import social.peal.ApiClient;
import social.peal.ApiException;
import social.peal.Configuration;
import social.peal.models.*;
import social.peal.api.SystemApi;

public class Example {
  public static void main(String[] args) {
    ApiClient defaultClient = Configuration.getDefaultApiClient();
    defaultClient.setBasePath("https://app.peal.social");

    SystemApi apiInstance = new SystemApi(defaultClient);
    try {
      apiInstance.health();
    } catch (ApiException e) {
      System.err.println("Exception when calling SystemApi#health");
      System.err.println("Status code: " + e.getCode());
      System.err.println("Reason: " + e.getResponseBody());
      System.err.println("Response headers: " + e.getResponseHeaders());
      e.printStackTrace();
    }
  }
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

null (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **204** | The server is up. |  -  |

<a id="ready"></a>
# **ready**
> ready()

Check that the server can take traffic

Answers once the server can reach its database, and fails with DatabaseUnavailable while it cannot. Use it as a readiness check before sending traffic.

### Example
```java
// Import classes:
import social.peal.ApiClient;
import social.peal.ApiException;
import social.peal.Configuration;
import social.peal.models.*;
import social.peal.api.SystemApi;

public class Example {
  public static void main(String[] args) {
    ApiClient defaultClient = Configuration.getDefaultApiClient();
    defaultClient.setBasePath("https://app.peal.social");

    SystemApi apiInstance = new SystemApi(defaultClient);
    try {
      apiInstance.ready();
    } catch (ApiException e) {
      System.err.println("Exception when calling SystemApi#ready");
      System.err.println("Status code: " + e.getCode());
      System.err.println("Reason: " + e.getResponseBody());
      System.err.println("Response headers: " + e.getResponseHeaders());
      e.printStackTrace();
    }
  }
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

null (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **204** | The server and its database both answer. |  -  |
| **503** | The server cannot reach its database. |  -  |

