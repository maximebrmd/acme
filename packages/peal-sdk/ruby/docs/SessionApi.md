# Peal::SessionApi

All URIs are relative to *https://app.peal.social*

| Method | HTTP request | Description |
| ------ | ------------ | ----------- |
| [**session_me**](SessionApi.md#session_me) | **GET** /api/me | Get the signed-in user |


## session_me

> <Me> session_me

Get the signed-in user

Answers with the signed-in user and every workspace they belong to, with their role and permissions in each. API keys belong to a workspace, not a user, and get 403.

### Examples

```ruby
require 'time'
require 'peal'
# setup authorization
Peal.configure do |config|
  # Configure Bearer authorization: bearer
  config.access_token = 'YOUR_BEARER_TOKEN'
end

api_instance = Peal::SessionApi.new

begin
  # Get the signed-in user
  result = api_instance.session_me
  p result
rescue Peal::ApiError => e
  puts "Error when calling SessionApi->session_me: #{e}"
end
```

#### Using the session_me_with_http_info variant

This returns an Array which contains the response data, status code and headers.

> <Array(<Me>, Integer, Hash)> session_me_with_http_info

```ruby
begin
  # Get the signed-in user
  data, status_code, headers = api_instance.session_me_with_http_info
  p status_code # => 2xx
  p headers # => { ... }
  p data # => <Me>
rescue Peal::ApiError => e
  puts "Error when calling SessionApi->session_me_with_http_info: #{e}"
end
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

