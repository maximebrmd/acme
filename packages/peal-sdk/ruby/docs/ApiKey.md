# Peal::ApiKey

## Properties

| Name | Type | Description | Notes |
| ---- | ---- | ----------- | ----- |
| **created_at** | **String** |  |  |
| **expires_at** | **String** |  |  |
| **id** | **String** |  |  |
| **name** | **String** |  |  |
| **permissions** | [**Array&lt;Permission&gt;**](Permission.md) |  |  |
| **start** | **String** |  |  |

## Example

```ruby
require 'peal'

instance = Peal::ApiKey.new(
  created_at: null,
  expires_at: null,
  id: null,
  name: null,
  permissions: null,
  start: null
)
```

