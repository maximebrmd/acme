# Peal::BillingApi

All URIs are relative to *https://app.peal.social*

| Method | HTTP request | Description |
| ------ | ------------ | ----------- |
| [**billing_get**](BillingApi.md#billing_get) | **GET** /api/workspaces/{workspaceId}/billing | Get the workspace&#39;s billing |


## billing_get

> <Billing> billing_get(workspace_id)

Get the workspace's billing

Answers with the workspace's plan, the subscription that buys it, what each limit allows, how much of it the workspace uses, and every plan to compare. On a server that does not bill, nothing is limited. Needs billing:read.

### Examples

```ruby
require 'time'
require 'peal'
# setup authorization
Peal.configure do |config|
  # Configure Bearer authorization: bearer
  config.access_token = 'YOUR_BEARER_TOKEN'
end

api_instance = Peal::BillingApi.new
workspace_id = 'workspace_id_example' # String | 

begin
  # Get the workspace's billing
  result = api_instance.billing_get(workspace_id)
  p result
rescue Peal::ApiError => e
  puts "Error when calling BillingApi->billing_get: #{e}"
end
```

#### Using the billing_get_with_http_info variant

This returns an Array which contains the response data, status code and headers.

> <Array(<Billing>, Integer, Hash)> billing_get_with_http_info(workspace_id)

```ruby
begin
  # Get the workspace's billing
  data, status_code, headers = api_instance.billing_get_with_http_info(workspace_id)
  p status_code # => 2xx
  p headers # => { ... }
  p data # => <Billing>
rescue Peal::ApiError => e
  puts "Error when calling BillingApi->billing_get_with_http_info: #{e}"
end
```

### Parameters

| Name | Type | Description | Notes |
| ---- | ---- | ----------- | ----- |
| **workspace_id** | **String** |  |  |

### Return type

[**Billing**](Billing.md)

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

