# Peal::UploadTarget

## Properties

| Name | Type | Description | Notes |
| ---- | ---- | ----------- | ----- |
| **_tag** | **String** |  |  |
| **expires_at** | **String** |  |  |
| **request** | [**SignedRequest**](SignedRequest.md) |  |  |
| **part_size** | **Integer** |  |  |
| **parts** | [**Array&lt;UploadPart&gt;**](UploadPart.md) |  |  |

## Example

```ruby
require 'peal'

instance = Peal::UploadTarget.new(
  _tag: null,
  expires_at: null,
  request: null,
  part_size: null,
  parts: null
)
```

