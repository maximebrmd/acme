# Reference
## system
<details><summary><code>client.system.<a href="/lib/peal/system/client.rb">health</a>() -> </code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Answers as soon as the server is up, whatever the state of its database. Use it as a liveness or container health check.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```ruby
client.system.health
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**request_options:** `Peal::System::RequestOptions` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.system.<a href="/lib/peal/system/client.rb">ready</a>() -> </code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Answers once the server can reach its database, and fails with DatabaseUnavailable while it cannot. Use it as a readiness check before sending traffic.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```ruby
client.system.ready
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**request_options:** `Peal::System::RequestOptions` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## session
<details><summary><code>client.session.<a href="/lib/peal/session/client.rb">me</a>() -> Peal::Types::Me</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Answers with the signed-in user and every workspace they belong to, with their role and permissions in each. API keys belong to a workspace, not a user, and get 403.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```ruby
client.session.me
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**request_options:** `Peal::Session::RequestOptions` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## apiKeys
<details><summary><code>client.api_keys.<a href="/lib/peal/api_keys/client.rb">list</a>(workspace_id:) -> Internal::Types::Array[Peal::Types::APIKey]</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Lists the workspace's API keys. Needs apiKey:read.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```ruby
client.api_keys.list(workspace_id: "workspaceId")
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**workspace_id:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `Peal::APIKeys::RequestOptions` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.api_keys.<a href="/lib/peal/api_keys/client.rb">create</a>(workspace_id:, request) -> Peal::Types::CreatedAPIKey</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Creates an API key for the workspace with some of the caller's permissions, and answers with the key itself, which is not shown again. Needs apiKey:create, and a signed-in member: API keys cannot create keys.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```ruby
client.api_keys.create(
  workspace_id: "workspaceId",
  name: "name",
  permissions: ["analytics:read"]
)
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**workspace_id:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**expires_in_days:** `Integer` 
    
</dd>
</dl>

<dl>
<dd>

**name:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**permissions:** `Internal::Types::Array[Peal::Types::Permission]` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `Peal::APIKeys::RequestOptions` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.api_keys.<a href="/lib/peal/api_keys/client.rb">revoke</a>(workspace_id:, api_key_id:) -> </code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Revokes an API key of the workspace: it stops working at once. Needs apiKey:delete.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```ruby
client.api_keys.revoke(
  workspace_id: "workspaceId",
  api_key_id: "apiKeyId"
)
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**workspace_id:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**api_key_id:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `Peal::APIKeys::RequestOptions` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## channels
<details><summary><code>client.channels.<a href="/lib/peal/channels/client.rb">list</a>(workspace_id:) -> Internal::Types::Array[Peal::Types::Channel]</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Lists the channels connected to the workspace, oldest first. Their tokens are never shown. Needs channel:read.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```ruby
client.channels.list(workspace_id: "workspaceId")
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**workspace_id:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `Peal::Channels::RequestOptions` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.channels.<a href="/lib/peal/channels/client.rb">platforms</a>(workspace_id:) -> Peal::Types::ConnectablePlatforms</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Lists the platforms this server can connect accounts of, in Peal's order. A platform that needs a setting the server lacks, such as an app registered on LinkedIn, X or Meta or a Google OAuth client, is left out. Needs channel:connect.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```ruby
client.channels.platforms(workspace_id: "workspaceId")
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**workspace_id:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `Peal::Channels::RequestOptions` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.channels.<a href="/lib/peal/channels/client.rb">connect</a>(workspace_id:, platform:, request) -> Peal::Types::Authorization</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Starts connecting an account of the platform: answers with the platform's sign-in page, where the browser goes next. For Instagram, `connection` picks Instagram Login (the professional account itself, no Facebook Page needed) or Facebook Login (the accounts linked to the caller's Pages); without it, the server's preferred way. The connection is tied to the caller and the workspace, and must be completed within 15 minutes. On a server that bills, a workspace whose plan allows no more channels gets PlanLimitReached. Needs channel:connect.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```ruby
client.channels.connect(
  workspace_id: "workspaceId",
  platform: "x"
)
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**workspace_id:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**platform:** `Peal::Types::Platform` 
    
</dd>
</dl>

<dl>
<dd>

**connection:** `Peal::Types::InstagramConnection` 
    
</dd>
</dl>

<dl>
<dd>

**handle:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**instance:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `Peal::Channels::RequestOptions` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.channels.<a href="/lib/peal/channels/client.rb">complete_connect</a>(workspace_id:, platform:, request) -> Peal::Types::ConnectOutcome</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Completes a connection with what the platform sent back: the account becomes a channel of the workspace, or the channel it reconnects takes its new tokens. When the sign-in reached several accounts, as the Pages a Facebook user manages, the answer lists them instead, to choose with chooseAccounts. Only the member who started the connection can complete it, once. A new account needs room in the workspace's plan (PlanLimitReached). Needs channel:connect.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```ruby
client.channels.complete_connect(
  workspace_id: "workspaceId",
  platform: "x",
  state: "state"
)
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**workspace_id:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**platform:** `Peal::Types::Platform` 
    
</dd>
</dl>

<dl>
<dd>

**code:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**error:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**iss:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**state:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `Peal::Channels::RequestOptions` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.channels.<a href="/lib/peal/channels/client.rb">choose_accounts</a>(workspace_id:, platform:, request) -> Internal::Types::Array[Peal::Types::Channel]</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Connects the accounts the member chose among those a completed sign-in listed: each becomes a channel of the workspace, or reconnects the one it has. The new accounts chosen need room in the workspace's plan, all of them: otherwise none is connected (PlanLimitReached), and the choice can be made again with fewer. Only the member who completed the sign-in can choose, within 15 minutes, and once an account is connected: a choice that failed before connecting any can be made again. Needs channel:connect.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```ruby
client.channels.choose_accounts(
  workspace_id: "workspaceId",
  platform: "x",
  account_ids: ["accountIds"],
  selection: "selection"
)
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**workspace_id:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**platform:** `Peal::Types::Platform` 
    
</dd>
</dl>

<dl>
<dd>

**account_ids:** `Internal::Types::Array[String]` 
    
</dd>
</dl>

<dl>
<dd>

**selection:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `Peal::Channels::RequestOptions` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.channels.<a href="/lib/peal/channels/client.rb">reconnect</a>(workspace_id:, channel_id:) -> Peal::Types::Authorization</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Starts reconnecting a channel whose token stopped working or is about to: answers with the platform's sign-in page. Completing it must sign in to the same account. A channel the workspace has takes no room in its plan, so no plan limit refuses it. Needs channel:connect.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```ruby
client.channels.reconnect(
  workspace_id: "workspaceId",
  channel_id: "channelId"
)
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**workspace_id:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**channel_id:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `Peal::Channels::RequestOptions` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.channels.<a href="/lib/peal/channels/client.rb">disconnect</a>(workspace_id:, channel_id:) -> </code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Disconnects a channel from the workspace: the channel and the tokens Peal holds for it are deleted, and nothing more is posted on it. Needs channel:disconnect.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```ruby
client.channels.disconnect(
  workspace_id: "workspaceId",
  channel_id: "channelId"
)
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**workspace_id:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**channel_id:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `Peal::Channels::RequestOptions` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## posts
<details><summary><code>client.posts.<a href="/lib/peal/posts/client.rb">drafts</a>(workspace_id:) -> Peal::Types::DraftPage</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Lists the workspace's drafts, newest first, 20 a page unless `limit` (at most 50) says otherwise. Pass the page's `nextCursor` as `cursor` for the next one. Needs post:read.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```ruby
client.posts.drafts(workspace_id: "workspaceId")
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**workspace_id:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**cursor:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**limit:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `Peal::Posts::RequestOptions` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.posts.<a href="/lib/peal/posts/client.rb">list</a>(workspace_id:) -> Internal::Types::Array[Peal::Types::Post]</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Lists the posts scheduled from `from` (included) to `to` (excluded), at most 62 days apart, by scheduled instant, with their channels and how each went. Drafts have no time and are not listed; cancelled posts are, with the time they had. Needs post:read.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```ruby
client.posts.list(
  workspace_id: "workspaceId",
  from: "from",
  to: "to"
)
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**workspace_id:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**from:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**to:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `Peal::Posts::RequestOptions` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.posts.<a href="/lib/peal/posts/client.rb">create</a>(workspace_id:, request) -> Peal::Types::Post</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Creates a draft for some of the workspace's channels, possibly none yet, with options on those whose platform takes them (`TargetOptions`, of the channel's platform). Its media must be the workspace's, and ready. Its text, media and options are checked against each platform's rules when it is scheduled, not before. Needs post:create, channel:read, and media:read when it shows media.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```ruby
client.posts.create(
  workspace_id: "workspaceId",
  channel_ids: ["channelIds"],
  content: {
    media: [{
      altText: "altText",
      mediaId: "mediaId"
    }],
    overrides: [{
      channelId: "channelId",
      text: "text"
    }],
    text: "text"
  }
)
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**workspace_id:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**request:** `Peal::Types::PostDraft` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `Peal::Posts::RequestOptions` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.posts.<a href="/lib/peal/posts/client.rb">send_</a>(workspace_id:, request) -> Peal::Types::Post</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Creates a post and sends it to some of the workspace's channels in one call: `when` is `now`, which publishes at once, or `at` an instant, kept with its IANA time zone. It goes through every rule scheduling a draft does (each platform's limits on text, media and options, the account's own, the plan's), and answers every violation at once (PostContentInvalid): nothing is made then. What it publishes reaches the platforms' public, and cannot be taken back from Peal once it is out; until its time, cancel or unschedule it. Send an `Idempotency-Key` header (any text of your choosing, at most 255 characters, such as a UUID) to make a request safe to send again: within 24 hours, the same key with the same body answers the post the first request made, as it now stands, and makes no other; the same key with another body is refused (IdempotencyKeyReused), and answers PostNotFound once that post was deleted. Keys are kept per workspace, as digests. Needs post:schedule and channel:read, and media:read when it shows media; an OAuth client needs the scope workspace:publish.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```ruby
client.posts.send_(
  workspace_id: "workspaceId",
  channel_ids: ["channelIds"],
  content: {
    media: [{
      altText: "altText",
      mediaId: "mediaId"
    }],
    overrides: [{
      channelId: "channelId",
      text: "text"
    }],
    text: "text"
  }
)
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**workspace_id:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**idempotency_key:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**channel_ids:** `Internal::Types::Array[String]` 
    
</dd>
</dl>

<dl>
<dd>

**content:** `Peal::Types::PostContent` 
    
</dd>
</dl>

<dl>
<dd>

**options:** `Internal::Types::Array[Peal::Types::ChannelOptions]` 
    
</dd>
</dl>

<dl>
<dd>

**when_:** `Peal::Types::PostTiming` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `Peal::Posts::RequestOptions` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.posts.<a href="/lib/peal/posts/client.rb">get</a>(workspace_id:, post_id:) -> Peal::Types::Post</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Answers with a post of the workspace. Needs post:read.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```ruby
client.posts.get(
  workspace_id: "workspaceId",
  post_id: "postId"
)
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**workspace_id:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**post_id:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `Peal::Posts::RequestOptions` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.posts.<a href="/lib/peal/posts/client.rb">update</a>(workspace_id:, post_id:, request) -> Peal::Types::Post</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Replaces a draft's content, channels and options: options left out are removed. A post that is no longer a draft is a conflict. Needs post:update, channel:read, and media:read when it shows media.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```ruby
client.posts.update(
  workspace_id: "workspaceId",
  post_id: "postId",
  channel_ids: ["channelIds"],
  content: {
    media: [{
      altText: "altText",
      mediaId: "mediaId"
    }],
    overrides: [{
      channelId: "channelId",
      text: "text"
    }],
    text: "text"
  }
)
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**workspace_id:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**post_id:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**request:** `Peal::Types::PostDraft` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `Peal::Posts::RequestOptions` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.posts.<a href="/lib/peal/posts/client.rb">discard</a>(workspace_id:, post_id:) -> </code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Deletes a draft. A post scheduled or sent is a conflict: cancel it instead. Needs post:delete, or post:update for the user who created the draft.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```ruby
client.posts.discard(
  workspace_id: "workspaceId",
  post_id: "postId"
)
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**workspace_id:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**post_id:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `Peal::Posts::RequestOptions` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.posts.<a href="/lib/peal/posts/client.rb">attempts</a>(workspace_id:, post_id:) -> Internal::Types::Array[Peal::Types::PublicationAttempt]</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Lists every attempt Peal made at publishing the post, by channel, round and attempt, with how each ended. An attempt still in progress is not listed yet. Needs post:read.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```ruby
client.posts.attempts(
  workspace_id: "workspaceId",
  post_id: "postId"
)
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**workspace_id:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**post_id:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `Peal::Posts::RequestOptions` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.posts.<a href="/lib/peal/posts/client.rb">schedule</a>(workspace_id:, post_id:, request) -> Peal::Types::Post</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Schedules a draft on some of the workspace's channels at an instant, kept with the IANA time zone it was chosen in. The content must fit each platform's rules, its media included: file types, sizes, durations, dimensions, alt text, how many videos, and whether images and videos go together. A channel whose platform takes options needs those it requires, as the draft gives them on that channel: a channel the draft was not for has none yet. A time up to a minute ago publishes now. On a server that bills, the posts going out in that month (UTC) must fit the workspace's plan (PlanLimitReached). Needs post:schedule and channel:read, and media:read when it shows media.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```ruby
client.posts.schedule(
  workspace_id: "workspaceId",
  post_id: "postId",
  at: "at",
  channel_ids: ["channelIds"],
  time_zone: "timeZone"
)
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**workspace_id:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**post_id:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**at:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**channel_ids:** `Internal::Types::Array[String]` 
    
</dd>
</dl>

<dl>
<dd>

**time_zone:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `Peal::Posts::RequestOptions` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.posts.<a href="/lib/peal/posts/client.rb">reschedule</a>(workspace_id:, post_id:, request) -> Peal::Types::Post</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Moves a scheduled post to another instant, or schedules a draft on the channels it has. Moved to another month, or scheduled, it must fit that month's posts in the workspace's plan (PlanLimitReached). Needs post:schedule, and channel:read for a draft.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```ruby
client.posts.reschedule(
  workspace_id: "workspaceId",
  post_id: "postId",
  at: "at",
  time_zone: "timeZone"
)
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**workspace_id:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**post_id:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**request:** `Peal::Types::PostSchedule` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `Peal::Posts::RequestOptions` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.posts.<a href="/lib/peal/posts/client.rb">unschedule</a>(workspace_id:, post_id:) -> Peal::Types::Post</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Takes a scheduled post back to draft, so its text and media can change: it goes out at no time until it is scheduled again. A post already publishing is a conflict. Needs post:schedule.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```ruby
client.posts.unschedule(
  workspace_id: "workspaceId",
  post_id: "postId"
)
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**workspace_id:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**post_id:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `Peal::Posts::RequestOptions` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.posts.<a href="/lib/peal/posts/client.rb">repost</a>(workspace_id:, post_id:, target_id:) -> Peal::Types::Post</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Sends the post again, now, on one channel where it failed or is unconfirmed: a new round, with its own attempts. Check the platform first when it is unconfirmed, as it may be live already. Needs post:schedule.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```ruby
client.posts.repost(
  workspace_id: "workspaceId",
  post_id: "postId",
  target_id: "targetId"
)
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**workspace_id:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**post_id:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**target_id:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `Peal::Posts::RequestOptions` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.posts.<a href="/lib/peal/posts/client.rb">confirm</a>(workspace_id:, post_id:, target_id:, request) -> Peal::Types::Post</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Says what you found on the platform for a post unconfirmed on one channel: `published`, with its address if you have it, or `notPublished`, which fails it there so it can be reposted. Its notifications are marked read. Needs post:schedule.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```ruby
client.posts.confirm(
  workspace_id: "workspaceId",
  post_id: "postId",
  target_id: "targetId"
)
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**workspace_id:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**post_id:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**target_id:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**request:** `Peal::Types::TargetConfirmation` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `Peal::Posts::RequestOptions` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.posts.<a href="/lib/peal/posts/client.rb">cancel</a>(workspace_id:, post_id:) -> Peal::Types::Post</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Cancels a draft or a scheduled post. A post already publishing finishes with what its channels did: those not yet sent are cancelled. Needs post:schedule.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```ruby
client.posts.cancel(
  workspace_id: "workspaceId",
  post_id: "postId"
)
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**workspace_id:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**post_id:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `Peal::Posts::RequestOptions` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## media
<details><summary><code>client.media.<a href="/lib/peal/media/client.rb">list</a>(workspace_id:) -> Peal::Types::MediaPage</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Lists the workspace's media, newest first, 30 a page unless `limit` (at most 100) says otherwise. Pass the page's `nextCursor` as `cursor` for the next one. Needs media:read.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```ruby
client.media.list(workspace_id: "workspaceId")
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**workspace_id:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**cursor:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**limit:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `Peal::Media::RequestOptions` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.media.<a href="/lib/peal/media/client.rb">create</a>(workspace_id:, request) -> Peal::Types::PreparedUpload</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Records pending media and signs the upload of its file: one PUT for an image or a video up to 16 MiB, one PUT per part for a larger video. Send the file with them, then complete the upload. The requests only take the declared size and content type. On a server that bills, the declared size must fit the plan's media storage with what the workspace stores (PlanLimitReached `mediaStorage`). Needs media:upload.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```ruby
client.media.create(
  workspace_id: "workspaceId",
  byte_size: 1,
  content_type: "contentType"
)
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**workspace_id:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**alt_text:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**byte_size:** `Integer` 
    
</dd>
</dl>

<dl>
<dd>

**content_type:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `Peal::Media::RequestOptions` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.media.<a href="/lib/peal/media/client.rb">import_from_url</a>(workspace_id:, request) -> Peal::Types::Media</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Fetches a file from a public address, stores it as media of the workspace and probes it, as completing an upload does: the answer is the media, ready, or uploaded with why it could not be probed. The server fetches it itself, from HTTPS URLs on the default port whose host resolves to public addresses only, without credentials or cookies, following at most three redirects, each checked the same way (MediaSourceNotPublic otherwise). The file's type is read from its first bytes, not from what the host says: JPEG, PNG, GIF and WebP images up to 16 MiB, MP4 and QuickTime videos up to 1 GiB (UnsupportedMediaType, MediaTooLarge). It must arrive within 90 seconds (MediaSourceUnreachable `tooSlow`): upload larger or slower files instead. On a server that bills, it must fit the plan's media storage with what the workspace stores (PlanLimitReached `mediaStorage`). A workspace imports two files at once, and the server eight (429 MediaImportBusy: ask again in a moment). Needs media:upload.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```ruby
client.media.import_from_url(
  workspace_id: "workspaceId",
  url: "url"
)
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**workspace_id:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**alt_text:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**url:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `Peal::Media::RequestOptions` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.media.<a href="/lib/peal/media/client.rb">get</a>(workspace_id:, media_id:) -> Peal::Types::Media</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Shows one of the workspace's media. Needs media:read.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```ruby
client.media.get(
  workspace_id: "workspaceId",
  media_id: "mediaId"
)
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**workspace_id:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**media_id:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `Peal::Media::RequestOptions` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.media.<a href="/lib/peal/media/client.rb">delete</a>(workspace_id:, media_id:) -> </code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Deletes the media and its file, and cancels its upload if it is still pending. Drafts that show it lose it. Posts scheduled or publishing that show it refuse the deletion (`MediaInUse`, listing them): take them back to draft first. Needs media:delete.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```ruby
client.media.delete(
  workspace_id: "workspaceId",
  media_id: "mediaId"
)
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**workspace_id:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**media_id:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `Peal::Media::RequestOptions` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.media.<a href="/lib/peal/media/client.rb">describe</a>(workspace_id:, media_id:, request) -> Peal::Types::Media</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Sets the media's description, which platforms show to people who cannot see it. It can be written while the file uploads. Needs media:upload.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```ruby
client.media.describe(
  workspace_id: "workspaceId",
  media_id: "mediaId",
  alt_text: nil
)
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**workspace_id:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**media_id:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**alt_text:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `Peal::Media::RequestOptions` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.media.<a href="/lib/peal/media/client.rb">complete</a>(workspace_id:, media_id:) -> Peal::Types::Media</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Checks that the file reached the store with the declared size and type, joining its parts first, then probes it: the media is ready, or stays uploaded with why it could not be probed. Calling it again is safe, and probes an uploaded file again. On a server that bills, the room an upload was given is held while its URLs work: completed later, it needs room in the plan's media storage again, and without it the file is deleted (PlanLimitReached `mediaStorage`). Needs media:upload.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```ruby
client.media.complete(
  workspace_id: "workspaceId",
  media_id: "mediaId"
)
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**workspace_id:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**media_id:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `Peal::Media::RequestOptions` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.media.<a href="/lib/peal/media/client.rb">usage</a>(workspace_id:, media_id:) -> Peal::Types::MediaUsage</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Lists the posts that show the media: drafts, which lose it if it is deleted, and posts scheduled or publishing, which keep it from being deleted. Needs media:read.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```ruby
client.media.usage(
  workspace_id: "workspaceId",
  media_id: "mediaId"
)
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**workspace_id:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**media_id:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `Peal::Media::RequestOptions` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## notices
<details><summary><code>client.notices.<a href="/lib/peal/notices/client.rb">list</a>() -> Peal::Types::NoticePage</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Lists the user's notices, newest first, 20 a page unless `limit` (at most 100) says otherwise. Pass the page's `nextCursor` as `cursor` for the next one. Each notice is data, for the client to write in the reader's language.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```ruby
client.notices.list
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**cursor:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**limit:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `Peal::Notices::RequestOptions` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.notices.<a href="/lib/peal/notices/client.rb">unread</a>() -> Peal::Types::UnreadNotices</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Counts the user's unread notices.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```ruby
client.notices.unread
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**request_options:** `Peal::Notices::RequestOptions` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.notices.<a href="/lib/peal/notices/client.rb">mark_read</a>(request) -> Peal::Types::UnreadNotices</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Marks up to 100 of the user's notices read, and answers with how many stay unread. Ids that name none of the user's notices, and notices already read, are left as they are.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```ruby
client.notices.mark_read(ids: ["ids"])
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**ids:** `Internal::Types::Array[String]` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `Peal::Notices::RequestOptions` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.notices.<a href="/lib/peal/notices/client.rb">mark_all_read</a>() -> Peal::Types::UnreadNotices</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Marks every notice of the user read.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```ruby
client.notices.mark_all_read
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**request_options:** `Peal::Notices::RequestOptions` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## notificationPreferences
<details><summary><code>client.notification_preferences.<a href="/lib/peal/notification_preferences/client.rb">get</a>() -> Peal::Types::NotificationPreferences</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Answers with which notices the user receives by email, and whether they hear about every post. Until they change it: failed and unconfirmed posts, and channels to reconnect, but not published posts, are emailed; and they hear only about the posts they wrote.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```ruby
client.notification_preferences.get
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**request_options:** `Peal::NotificationPreferences::RequestOptions` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.notification_preferences.<a href="/lib/peal/notification_preferences/client.rb">update</a>(request) -> Peal::Types::NotificationPreferences</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Changes the preferences given, keeps the others, and answers with them all. Staff impersonating the user may not change them.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```ruby
client.notification_preferences.update
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**email:** `Peal::NotificationPreferences::Types::NotificationPreferencesChangeEmail` 
    
</dd>
</dl>

<dl>
<dd>

**every_post:** `Internal::Types::Boolean` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `Peal::NotificationPreferences::RequestOptions` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## assistant
<details><summary><code>client.assistant.<a href="/lib/peal/assistant/client.rb">status</a>(workspace_id:) -> Peal::Types::AssistantStatus</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Tells whether the server has a language model, so clients show the assistant or hide it, and how many requests the workspace has left today. Needs assistant:use.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```ruby
client.assistant.status(workspace_id: "workspaceId")
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**workspace_id:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `Peal::Assistant::RequestOptions` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.assistant.<a href="/lib/peal/assistant/client.rb">suggest</a>(workspace_id:, request) -> Peal::Types::Suggestion</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Asks the language model to rewrite, shorten or translate a post's text, or to suggest hashtags for it, and answers once the whole suggestion is checked. The text is sent to the model as data, never as instructions. Each request counts toward the workspace's daily quota, unless the model's provider could not be reached. Needs assistant:use.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```ruby
client.assistant.suggest(
  workspace_id: "workspaceId",
  text: "text"
)
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**workspace_id:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**action:** `Peal::Types::AssistantAction` 
    
</dd>
</dl>

<dl>
<dd>

**text:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `Peal::Assistant::RequestOptions` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## members
<details><summary><code>client.members.<a href="/lib/peal/members/client.rb">list</a>(workspace_id:) -> Internal::Types::Array[Peal::Types::WorkspaceMember]</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Lists the workspace's members, in the order they joined, with their name, email address and role. Every member may see them, as the workspace's settings show them; an API key may not, as members' addresses are not a script's to read.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```ruby
client.members.list(workspace_id: "workspaceId")
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**workspace_id:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `Peal::Members::RequestOptions` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## invitations
<details><summary><code>client.invitations.<a href="/lib/peal/invitations/client.rb">list</a>(workspace_id:) -> Internal::Types::Array[Peal::Types::Invitation]</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Lists the workspace's pending invitations, oldest first, expired ones included. Needs invitation:create, as an invitation's id opens its link, and a member rather than an API key; invitations to the owner role are listed to owners only.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```ruby
client.invitations.list(workspace_id: "workspaceId")
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**workspace_id:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `Peal::Invitations::RequestOptions` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.invitations.<a href="/lib/peal/invitations/client.rb">create</a>(workspace_id:, request) -> Peal::Types::Invitation</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Invites someone to the workspace with a role: Peal emails them a link that works for 7 days, in their language when they have an account, in the inviter's otherwise. A pending invitation to the same address is revoked, and its link stops working. Only owners invite owners. On a server that bills, the members and the other pending invitations must leave room in the workspace's plan (PlanLimitReached). Needs invitation:create, and a member in person: not an API key, nor staff impersonating one.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```ruby
client.invitations.create(
  workspace_id: "workspaceId",
  email: "email",
  role: "owner"
)
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**workspace_id:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**email:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**role:** `Peal::Types::Role` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `Peal::Invitations::RequestOptions` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.invitations.<a href="/lib/peal/invitations/client.rb">revoke</a>(workspace_id:, invitation_id:) -> </code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Revokes a pending invitation of the workspace: its link stops working at once. Needs invitation:cancel, and a member in person: not an API key, nor staff impersonating one.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```ruby
client.invitations.revoke(
  workspace_id: "workspaceId",
  invitation_id: "invitationId"
)
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**workspace_id:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**invitation_id:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `Peal::Invitations::RequestOptions` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## billing
<details><summary><code>client.billing.<a href="/lib/peal/billing/client.rb">get</a>(workspace_id:) -> Peal::Types::Billing</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Answers with the workspace's plan, the subscription that buys it, what each limit allows, how much of it the workspace uses, and every plan to compare. On a server that does not bill, nothing is limited. Needs billing:read.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```ruby
client.billing.get(workspace_id: "workspaceId")
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**workspace_id:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `Peal::Billing::RequestOptions` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.billing.<a href="/lib/peal/billing/client.rb">standing</a>(workspace_id:) -> Peal::Types::Standing</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Answers where the workspace stands against its plan: what it holds beyond it, as after a trial or a cancelled subscription, whether it must come back within it before anything else (more channels or members than the plan allows: nothing is scheduled or published until then, and posts already scheduled fail when due with `planLimit`), the smallest plan that holds everything, and how many posts wait. Those who manage billing order that plan, or choose what stays, in the web app. For every member of the workspace.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```ruby
client.billing.standing(workspace_id: "workspaceId")
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**workspace_id:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `Peal::Billing::RequestOptions` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## analytics
<details><summary><code>client.analytics.<a href="/lib/peal/analytics/client.rb">summary</a>(workspace_id:) -> Peal::Types::AnalyticsSummary</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Sums up the posts published from `from` to `to`, both included and at most 366 days, as days run in `timeZone` (an IANA zone such as Europe/Paris): their latest counts in all and by channel, what they gained each day, and the five with the most engagement (likes, reposts, replies and quotes). Counts are read from the platforms every hour for 48 hours after a post goes live, then every day until it is 30 days old. Needs analytics:read.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```ruby
client.analytics.summary(
  workspace_id: "workspaceId",
  from: "from",
  time_zone: "timeZone",
  to: "to"
)
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**workspace_id:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**from:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**time_zone:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**to:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `Peal::Analytics::RequestOptions` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.analytics.<a href="/lib/peal/analytics/client.rb">post</a>(workspace_id:, post_id:) -> Peal::Types::PostAnalytics</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Answers with the counts of a post on each channel it went live on, over time. A post not published yet, or whose counts were not read yet, has no targets. Needs analytics:read.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```ruby
client.analytics.post(
  workspace_id: "workspaceId",
  post_id: "postId"
)
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**workspace_id:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**post_id:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `Peal::Analytics::RequestOptions` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## tiktok
<details><summary><code>client.tiktok.<a href="/lib/peal/tiktok/client.rb">creator</a>(workspace_id:, channel_id:) -> Peal::Types::TikTokAccount</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Reads a TikTok channel's creator from TikTok: their nickname, the audiences the account offers, the interactions they turned off and the longest video they may post, or why they cannot post now. A channel that is not TikTok's is ChannelNotFound. Needs post:create.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```ruby
client.tiktok.creator(
  workspace_id: "workspaceId",
  channel_id: "channelId"
)
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**workspace_id:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**channel_id:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `Peal::Tiktok::RequestOptions` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## webhooks
<details><summary><code>client.webhooks.<a href="/lib/peal/webhooks/client.rb">list</a>(workspace_id:) -> Internal::Types::Array[Peal::Types::WebhookEndpoint]</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Lists the workspace's webhook endpoints, oldest first. Needs webhook:read.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```ruby
client.webhooks.list(workspace_id: "workspaceId")
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**workspace_id:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `Peal::Webhooks::RequestOptions` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.webhooks.<a href="/lib/peal/webhooks/client.rb">create</a>(workspace_id:, request) -> Peal::Types::WebhookEndpointSecret</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Adds a webhook endpoint to the workspace, and answers with its signing secret, which is not shown again. Its address must be HTTPS on the default port, on a public host, without credentials; Peal follows no redirect from it. A workspace has 10 endpoints at most, whatever its plan. With `scope` `partner`, in the home workspace of a partner account, the endpoint also hears what happens in every workspace the partner owns, each event naming its workspace and carrying the partner's own id for it (`workspaceExternalId`); any other workspace answers 404 `PartnerNotFound`. Needs webhook:manage.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```ruby
client.webhooks.create(
  workspace_id: "workspaceId",
  event_types: ["post.scheduled"],
  url: "url"
)
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**workspace_id:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**description:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**enabled:** `Internal::Types::Boolean` 
    
</dd>
</dl>

<dl>
<dd>

**event_types:** `Internal::Types::Array[Peal::Types::SubscribableWebhookEventType]` 
    
</dd>
</dl>

<dl>
<dd>

**scope:** `Peal::Types::WebhookEndpointScope` 
    
</dd>
</dl>

<dl>
<dd>

**url:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `Peal::Webhooks::RequestOptions` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.webhooks.<a href="/lib/peal/webhooks/client.rb">get</a>(workspace_id:, endpoint_id:) -> Peal::Types::WebhookEndpoint</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Shows one of the workspace's webhook endpoints. Needs webhook:read.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```ruby
client.webhooks.get(
  workspace_id: "workspaceId",
  endpoint_id: "endpointId"
)
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**workspace_id:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**endpoint_id:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `Peal::Webhooks::RequestOptions` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.webhooks.<a href="/lib/peal/webhooks/client.rb">delete</a>(workspace_id:, endpoint_id:) -> </code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Deletes an endpoint, its secret and its delivery log: nothing more is sent to it. Needs webhook:manage.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```ruby
client.webhooks.delete(
  workspace_id: "workspaceId",
  endpoint_id: "endpointId"
)
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**workspace_id:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**endpoint_id:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `Peal::Webhooks::RequestOptions` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.webhooks.<a href="/lib/peal/webhooks/client.rb">update</a>(workspace_id:, endpoint_id:, request) -> Peal::Types::WebhookEndpoint</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Changes an endpoint's address, description or events, or turns it off or back on: what is left out stays as it is. Turned off, it is sent nothing, its pending deliveries fail, and events that happen meanwhile are not kept for it. Turning it back on forgets the failures that turned it off. Needs webhook:manage.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```ruby
client.webhooks.update(
  workspace_id: "workspaceId",
  endpoint_id: "endpointId"
)
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**workspace_id:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**endpoint_id:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**description:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**enabled:** `Internal::Types::Boolean` 
    
</dd>
</dl>

<dl>
<dd>

**event_types:** `Internal::Types::Array[Peal::Types::SubscribableWebhookEventType]` 
    
</dd>
</dl>

<dl>
<dd>

**url:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `Peal::Webhooks::RequestOptions` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.webhooks.<a href="/lib/peal/webhooks/client.rb">rotate_secret</a>(workspace_id:, endpoint_id:) -> Peal::Types::WebhookEndpointSecret</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Replaces an endpoint's signing secret, and answers with the new one, which is not shown again. For 24 hours each delivery carries two signatures, one per secret, so the receiver changes its own without missing any; the old one then signs nothing more. Needs webhook:manage.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```ruby
client.webhooks.rotate_secret(
  workspace_id: "workspaceId",
  endpoint_id: "endpointId"
)
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**workspace_id:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**endpoint_id:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `Peal::Webhooks::RequestOptions` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.webhooks.<a href="/lib/peal/webhooks/client.rb">send_test</a>(workspace_id:, endpoint_id:) -> Peal::Types::WebhookDelivery</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Sends the endpoint a `webhook.test` event, whatever it subscribes to, and answers with its delivery, still pending: read the endpoint's deliveries to see how it ended. A workspace sends 30 test events and deliveries again an hour at most (429 `TooManyWebhookSends`). Needs webhook:manage.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```ruby
client.webhooks.send_test(
  workspace_id: "workspaceId",
  endpoint_id: "endpointId"
)
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**workspace_id:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**endpoint_id:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `Peal::Webhooks::RequestOptions` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.webhooks.<a href="/lib/peal/webhooks/client.rb">list_deliveries</a>(workspace_id:, endpoint_id:) -> Peal::Types::WebhookDeliveryPage</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Lists the endpoint's deliveries, newest first, 30 a page unless `limit` (at most 100) says otherwise: each one's status, the receiver's last answer, how many attempts were made and when the next one is. Pass the page's `nextCursor` as `cursor` for the next one. A delivery is kept 30 days. Needs webhook:read.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```ruby
client.webhooks.list_deliveries(
  workspace_id: "workspaceId",
  endpoint_id: "endpointId"
)
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**workspace_id:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**endpoint_id:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**cursor:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**limit:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `Peal::Webhooks::RequestOptions` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.webhooks.<a href="/lib/peal/webhooks/client.rb">redeliver</a>(workspace_id:, endpoint_id:, delivery_id:) -> Peal::Types::WebhookDelivery</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Sends the delivery's event to the endpoint again, as a new delivery of the same event: the receiver gets the same `webhook-id` and body, with a new timestamp and signature. A workspace sends 30 test events and deliveries again an hour at most (429 `TooManyWebhookSends`). Needs webhook:manage.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```ruby
client.webhooks.redeliver(
  workspace_id: "workspaceId",
  endpoint_id: "endpointId",
  delivery_id: "deliveryId"
)
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**workspace_id:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**endpoint_id:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**delivery_id:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `Peal::Webhooks::RequestOptions` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## partner
<details><summary><code>client.partner.<a href="/lib/peal/partner/client.rb">account</a>() -> Peal::Types::PartnerOverview</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

The partner account the key belongs to, with what it holds: the workspaces it owns and the channels connected across them and its home workspace, now and at the end of each of the last 35 days (UTC). Takes a partner key (`Authorization: Bearer peal_partner_…`): any other credential answers 403.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```ruby
client.partner.account
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**request_options:** `Peal::Partner::RequestOptions` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.partner.<a href="/lib/peal/partner/client.rb">list_workspaces</a>() -> Peal::Types::CustomerWorkspacePage</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Lists the workspaces the partner owns, newest first, each with the number of channels connected in it, 50 a page unless `limit` (at most 100) says otherwise. `externalId` finds the one workspace with that external id, exactly; `name` those whose name holds the text, whatever its case. `total` counts what the filters find; pass the page's `next` as `before` for the next page. Needs the scope workspaces:read. Takes a partner key (`Authorization: Bearer peal_partner_…`): any other credential answers 403.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```ruby
client.partner.list_workspaces
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**before:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**external_id:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**limit:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**name:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `Peal::Partner::RequestOptions` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.partner.<a href="/lib/peal/partner/client.rb">create_workspace</a>(request) -> Peal::Types::CustomerWorkspace</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Creates a workspace for one of the partner's customers: it has no members, shares the plan of the partner's home workspace, and the partner's keys act in it. `externalId`, the partner's own id for its customer, is unique among the partner's workspaces: a second workspace with it answers 409 `ExternalIdTaken` with the id of the one that has it, so a creation sent twice never makes two. Send an `Idempotency-Key` header (any text of your choosing, at most 255 characters, such as a UUID) to make a request safe to send again: within 24 hours, the same key with the same body answers the workspace the first request made, as it now stands, and makes no other; the same key with another body is refused (`IdempotencyKeyReused`), and answers `WorkspaceNotFound` once that workspace was deleted. Keys are kept per partner, as digests. Needs the scope workspaces:write. Takes a partner key (`Authorization: Bearer peal_partner_…`): any other credential answers 403.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```ruby
client.partner.create_workspace(name: "name")
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**idempotency_key:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**external_id:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**name:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `Peal::Partner::RequestOptions` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.partner.<a href="/lib/peal/partner/client.rb">get_workspace</a>(workspace_id:) -> Peal::Types::CustomerWorkspace</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

One workspace the partner owns, with the number of channels connected in it. A workspace of anyone else answers 404, as one that does not exist. Needs the scope workspaces:read. Takes a partner key (`Authorization: Bearer peal_partner_…`): any other credential answers 403.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```ruby
client.partner.get_workspace(workspace_id: "workspaceId")
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**workspace_id:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `Peal::Partner::RequestOptions` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.partner.<a href="/lib/peal/partner/client.rb">delete_workspace</a>(workspace_id:) -> </code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Offboards a customer: deletes the workspace and everything in it, for good, as deleting a workspace does for its owner: its channels and their tokens (revoked at the platforms that take it, when no other workspace connects the same account), its posts, scheduled ones included, which then go out nowhere, its media and their files, its analytics, its webhook endpoints and their logs, its connect links. It cannot be undone. Answers 409 while a post of the workspace is being published (`WorkspaceBusy`): send it again a moment later. The deletion is recorded by id in the object store before it is done, so that a restored backup deletes the workspace again; when the store cannot be reached, nothing is deleted (503 `MediaStoreUnavailable`). Only a workspace the partner owns: any other answers 404. Needs the scope workspaces:delete. Takes a partner key (`Authorization: Bearer peal_partner_…`): any other credential answers 403.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```ruby
client.partner.delete_workspace(workspace_id: "workspaceId")
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**workspace_id:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `Peal::Partner::RequestOptions` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.partner.<a href="/lib/peal/partner/client.rb">update_workspace</a>(workspace_id:, request) -> Peal::Types::CustomerWorkspace</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Changes a workspace's name or external id: what is left out stays as it is, and a null `externalId` removes it. An external id another of the partner's workspaces has answers 409 `ExternalIdTaken`. Needs the scope workspaces:write. Takes a partner key (`Authorization: Bearer peal_partner_…`): any other credential answers 403.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```ruby
client.partner.update_workspace(workspace_id: "workspaceId")
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**workspace_id:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**external_id:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**name:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `Peal::Partner::RequestOptions` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## partnerAccount
<details><summary><code>client.partner_account.<a href="/lib/peal/partner_account/client.rb">get</a>(workspace_id:) -> Peal::Types::PartnerStanding</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

The workspace's partner account and what it holds, null when it has none, and whether its people may open one themselves on this server (`canOpen`). Needs partner:read.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```ruby
client.partner_account.get(workspace_id: "workspaceId")
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**workspace_id:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `Peal::PartnerAccount::RequestOptions` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.partner_account.<a href="/lib/peal/partner_account/client.rb">open</a>(workspace_id:, request) -> Peal::Types::Partner</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Opens a partner account for the workspace, which becomes its home workspace, under the name its customers will read; answers the one it has when it has one. On a server that opens partner accounts through its staff only, answers 403 `PartnerAccountsClosed`. Needs partner:manage, and a signed-in member rather than an API key or an OAuth client.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```ruby
client.partner_account.open(
  workspace_id: "workspaceId",
  name: "name"
)
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**workspace_id:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**name:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `Peal::PartnerAccount::RequestOptions` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.partner_account.<a href="/lib/peal/partner_account/client.rb">close</a>(workspace_id:) -> </code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Closes the workspace's partner account: its keys stop working at once. Refused while it owns workspaces (409 `PartnerOwnsWorkspaces`): delete each through the partner API first. Needs partner:manage, and a signed-in member rather than an API key or an OAuth client.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```ruby
client.partner_account.close(workspace_id: "workspaceId")
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**workspace_id:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `Peal::PartnerAccount::RequestOptions` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.partner_account.<a href="/lib/peal/partner_account/client.rb">update</a>(workspace_id:, request) -> Peal::Types::Partner</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Changes the partner account's name, its logo (an HTTPS URL, shown from that address on the hosted pages; null removes it) or its return origins: what is left out stays as it is. `returnOrigins` replaces the whole list, 20 at most: each is an origin as browsers write it (`https://app.example.com`: HTTPS, or HTTP on this machine alone, with nothing after the host and port). A hosted page sends a customer back only to an address whose origin is one of these, exactly. Needs partner:manage, and a signed-in member rather than an API key or an OAuth client.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```ruby
client.partner_account.update(workspace_id: "workspaceId")
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**workspace_id:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**logo_url:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**name:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**return_origins:** `Internal::Types::Array[String]` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `Peal::PartnerAccount::RequestOptions` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.partner_account.<a href="/lib/peal/partner_account/client.rb">list_keys</a>(workspace_id:) -> Internal::Types::Array[Peal::Types::PartnerKey]</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Lists the partner account's keys. Needs partner:read.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```ruby
client.partner_account.list_keys(workspace_id: "workspaceId")
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**workspace_id:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `Peal::PartnerAccount::RequestOptions` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.partner_account.<a href="/lib/peal/partner_account/client.rb">create_key</a>(workspace_id:, request) -> Peal::Types::CreatedPartnerKey</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Creates a partner key, and answers with the key itself, which is not shown again. It acts in every workspace the partner owns, with `permissions` (what a product does for its customers: channels, media, posts, analytics, the writing assistant, webhooks, reading the plan's usage; never members, invitations, API keys or billing changes, which answer 422), and on those workspaces themselves with `scopes`. It never acts in the home workspace, nor in any workspace the partner does not own. Needs partner:manage, and a signed-in member rather than an API key or an OAuth client: keys cannot create keys.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```ruby
client.partner_account.create_key(
  workspace_id: "workspaceId",
  name: "name",
  permissions: ["analytics:read"],
  scopes: ["workspaces:read"]
)
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**workspace_id:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**expires_in_days:** `Integer` 
    
</dd>
</dl>

<dl>
<dd>

**name:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**permissions:** `Internal::Types::Array[Peal::Types::Permission]` 
    
</dd>
</dl>

<dl>
<dd>

**scopes:** `Internal::Types::Array[Peal::Types::PartnerScope]` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `Peal::PartnerAccount::RequestOptions` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.partner_account.<a href="/lib/peal/partner_account/client.rb">revoke_key</a>(workspace_id:, partner_key_id:) -> </code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Revokes a partner key: it stops working at once. Needs partner:manage.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```ruby
client.partner_account.revoke_key(
  workspace_id: "workspaceId",
  partner_key_id: "partnerKeyId"
)
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**workspace_id:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**partner_key_id:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `Peal::PartnerAccount::RequestOptions` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.partner_account.<a href="/lib/peal/partner_account/client.rb">list_workspaces</a>(workspace_id:) -> Peal::Types::CustomerWorkspacePage</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Lists the workspaces the partner account owns, newest first, each with the number of channels connected in it, 50 a page unless `limit` (at most 100) says otherwise, with the filters and the paging of the partner API's list. Needs partner:read.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```ruby
client.partner_account.list_workspaces(workspace_id: "workspaceId")
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**workspace_id:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**before:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**external_id:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**limit:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**name:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `Peal::PartnerAccount::RequestOptions` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## connectLinks
<details><summary><code>client.connect_links.<a href="/lib/peal/connect_links/client.rb">list</a>(workspace_id:) -> Internal::Types::Array[Peal::Types::ConnectLink]</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Lists the workspace's connect links, newest first, the last 100: those waiting, and those used, revoked or expired in the last 30 days. Needs channel:read.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```ruby
client.connect_links.list(workspace_id: "workspaceId")
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**workspace_id:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `Peal::ConnectLinks::RequestOptions` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.connect_links.<a href="/lib/peal/connect_links/client.rb">create</a>(workspace_id:, request) -> Peal::Types::CreatedConnectLink</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Creates a link to hand to whoever owns an account of `platform`: it opens a hosted page where they sign in at the platform and, when the sign-in reaches several accounts, pick those to connect, without a Peal account. The answer holds the link's address, shown this once. The link works once, for 168 hours unless `expiresInHours` (1 to 720) says otherwise; with `channelId`, it reconnects that channel, and only a sign-in to the channel's own account goes through. `returnUrl` is where the page sends them once done, with `peal_link` (the link's id) and `peal_status` (`connected`, `cancelled` or `failed`) in its query: read the link by its id to know what was connected, as anyone can write those parameters. Its origin must be one the workspace's partner account registered, exactly (422 `ReturnUrlNotAllowed` otherwise, and for a workspace without a partner account). Whoever holds the address can connect an account of theirs to the workspace until it is used, revoked or expired: hand it over a channel you trust, and revoke it when it is no longer needed. A platform this server cannot connect answers 422 `ConnectFailed`. A workspace has 100 links waiting at most. Needs channel:connect.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```ruby
client.connect_links.create(
  workspace_id: "workspaceId",
  platform: "x"
)
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**workspace_id:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**channel_id:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**connection:** `Peal::Types::InstagramConnection` 
    
</dd>
</dl>

<dl>
<dd>

**expires_in_hours:** `Integer` 
    
</dd>
</dl>

<dl>
<dd>

**locale:** `Peal::Types::ConnectLinkLocale` 
    
</dd>
</dl>

<dl>
<dd>

**platform:** `Peal::Types::Platform` 
    
</dd>
</dl>

<dl>
<dd>

**return_url:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `Peal::ConnectLinks::RequestOptions` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.connect_links.<a href="/lib/peal/connect_links/client.rb">get</a>(workspace_id:, link_id:) -> Peal::Types::ConnectLink</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

One connect link of the workspace: where it stands, the channels it connected once `completed`, and how its last sign-in failed. Read it when a browser comes back to your return address, or on `channel.connected`. Needs channel:read.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```ruby
client.connect_links.get(
  workspace_id: "workspaceId",
  link_id: "linkId"
)
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**workspace_id:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**link_id:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `Peal::ConnectLinks::RequestOptions` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.connect_links.<a href="/lib/peal/connect_links/client.rb">revoke</a>(workspace_id:, link_id:) -> Peal::Types::ConnectLink</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Takes a connect link back: it opens nothing more, and a sign-in in progress through it does not complete. A link already used, revoked or expired stays as it is. Answers the link as it now stands. Needs channel:connect.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```ruby
client.connect_links.revoke(
  workspace_id: "workspaceId",
  link_id: "linkId"
)
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**workspace_id:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**link_id:** `String` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `Peal::ConnectLinks::RequestOptions` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

