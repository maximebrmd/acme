# Peal::SystemApi

All URIs are relative to *https://app.peal.social*

| Method | HTTP request | Description |
| ------ | ------------ | ----------- |
| [**health**](SystemApi.md#health) | **GET** /api/health | Check that the server is up |
| [**ready**](SystemApi.md#ready) | **GET** /api/ready | Check that the server can take traffic |


## health

> health

Check that the server is up

Answers as soon as the server is up, whatever the state of its database. Use it as a liveness or container health check.

### Examples

```ruby
require 'time'
require 'peal'

api_instance = Peal::SystemApi.new

begin
  # Check that the server is up
  api_instance.health
rescue Peal::ApiError => e
  puts "Error when calling SystemApi->health: #{e}"
end
```

#### Using the health_with_http_info variant

This returns an Array which contains the response data (`nil` in this case), status code and headers.

> <Array(nil, Integer, Hash)> health_with_http_info

```ruby
begin
  # Check that the server is up
  data, status_code, headers = api_instance.health_with_http_info
  p status_code # => 2xx
  p headers # => { ... }
  p data # => nil
rescue Peal::ApiError => e
  puts "Error when calling SystemApi->health_with_http_info: #{e}"
end
```

### Parameters

This endpoint does not need any parameter.

### Return type

nil (empty response body)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: Not defined


## ready

> ready

Check that the server can take traffic

Answers once the server can reach its database, and fails with DatabaseUnavailable while it cannot. Use it as a readiness check before sending traffic.

### Examples

```ruby
require 'time'
require 'peal'

api_instance = Peal::SystemApi.new

begin
  # Check that the server can take traffic
  api_instance.ready
rescue Peal::ApiError => e
  puts "Error when calling SystemApi->ready: #{e}"
end
```

#### Using the ready_with_http_info variant

This returns an Array which contains the response data (`nil` in this case), status code and headers.

> <Array(nil, Integer, Hash)> ready_with_http_info

```ruby
begin
  # Check that the server can take traffic
  data, status_code, headers = api_instance.ready_with_http_info
  p status_code # => 2xx
  p headers # => { ... }
  p data # => nil
rescue Peal::ApiError => e
  puts "Error when calling SystemApi->ready_with_http_info: #{e}"
end
```

### Parameters

This endpoint does not need any parameter.

### Return type

nil (empty response body)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

