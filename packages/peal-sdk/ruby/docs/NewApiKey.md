# Peal::NewApiKey

## Properties

| Name | Type | Description | Notes |
| ---- | ---- | ----------- | ----- |
| **expires_in_days** | **Integer** |  | [optional] |
| **name** | **String** |  |  |
| **permissions** | **Array&lt;String&gt;** |  |  |

## Example

```ruby
require 'peal'

instance = Peal::NewApiKey.new(
  expires_in_days: null,
  name: null,
  permissions: null
)
```

