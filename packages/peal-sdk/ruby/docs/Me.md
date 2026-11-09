# Peal::Me

## Properties

| Name | Type | Description | Notes |
| ---- | ---- | ----------- | ----- |
| **impersonated_by** | **String** |  |  |
| **user** | [**MeUser**](MeUser.md) |  |  |
| **workspaces** | [**Array&lt;Membership&gt;**](Membership.md) |  |  |

## Example

```ruby
require 'peal'

instance = Peal::Me.new(
  impersonated_by: null,
  user: null,
  workspaces: null
)
```

