# Peal::ConnectOutcome

## Properties

| Name | Type | Description | Notes |
| ---- | ---- | ----------- | ----- |
| **_tag** | **String** |  |  |
| **channel** | [**Channel**](Channel.md) |  |  |
| **accounts** | [**Array&lt;ChoosableAccount&gt;**](ChoosableAccount.md) |  |  |
| **expires_at** | **String** |  |  |
| **selection** | **String** |  |  |

## Example

```ruby
require 'peal'

instance = Peal::ConnectOutcome.new(
  _tag: null,
  channel: null,
  accounts: null,
  expires_at: null,
  selection: null
)
```

