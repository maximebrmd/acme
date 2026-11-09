# Peal::MediaStatus

## Properties

| Name | Type | Description | Notes |
| ---- | ---- | ----------- | ----- |
| **_tag** | **String** |  |  |
| **probe** | [**ProbeState**](ProbeState.md) |  |  |
| **reason** | [**RejectionReason**](RejectionReason.md) |  |  |

## Example

```ruby
require 'peal'

instance = Peal::MediaStatus.new(
  _tag: null,
  probe: null,
  reason: null
)
```

