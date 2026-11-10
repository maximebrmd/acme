# Reference
## system
<details><summary><code>client.System.Health() -> error</code></summary>
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

```go
err := client.System.Health(
    context.TODO(),
)
```
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.System.Ready() -> error</code></summary>
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

```go
err := client.System.Ready(
    context.TODO(),
)
```
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.System.Changelog() -> *peal.APIChangelog</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Lists the releases of the API, newest first: the operations each added and deprecated, how many additions it made in all, and any change that could break a client, which the versioning policy allows only with a reason. Needs no credentials.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```go
_, err := client.System.Changelog(
    context.TODO(),
)
```
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## session
<details><summary><code>client.Session.Me() -> *peal.Me</code></summary>
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

```go
_, err := client.Session.Me(
    context.TODO(),
)
```
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## apiKeys
<details><summary><code>client.APIKeys.List(WorkspaceID) -> []*peal.APIKey</code></summary>
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

```go
request := &peal.ListAPIKeysRequest{
    WorkspaceID: "workspaceId",
}
_, err := client.APIKeys.List(
    context.TODO(),
    request,
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

**workspaceID:** `string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.APIKeys.Create(WorkspaceID, request) -> *peal.CreatedAPIKey</code></summary>
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

```go
request := &peal.NewAPIKey{
    WorkspaceID: "workspaceId",
    Name: "name",
    Permissions: []peal.Permission{
        peal.PermissionActivityRead,
    },
}
_, err := client.APIKeys.Create(
    context.TODO(),
    request,
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

**workspaceID:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**expiresInDays:** `*int` 
    
</dd>
</dl>

<dl>
<dd>

**name:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**permissions:** `[]peal.Permission` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.APIKeys.Revoke(WorkspaceID, APIKeyID) -> error</code></summary>
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

```go
request := &peal.RevokeAPIKeysRequest{
    WorkspaceID: "workspaceId",
    APIKeyID: "apiKeyId",
}
err := client.APIKeys.Revoke(
    context.TODO(),
    request,
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

**workspaceID:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**apiKeyID:** `string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## channels
<details><summary><code>client.Channels.List(WorkspaceID) -> []*peal.Channel</code></summary>
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

```go
request := &peal.ListChannelsRequest{
    WorkspaceID: "workspaceId",
}
_, err := client.Channels.List(
    context.TODO(),
    request,
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

**workspaceID:** `string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Channels.Platforms(WorkspaceID) -> *peal.ConnectablePlatforms</code></summary>
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

```go
request := &peal.PlatformsChannelsRequest{
    WorkspaceID: "workspaceId",
}
_, err := client.Channels.Platforms(
    context.TODO(),
    request,
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

**workspaceID:** `string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Channels.Connect(WorkspaceID, Platform, request) -> *peal.Authorization</code></summary>
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

```go
request := &peal.ConnectChannel{
    WorkspaceID: "workspaceId",
    Platform: peal.PlatformX,
}
_, err := client.Channels.Connect(
    context.TODO(),
    request,
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

**workspaceID:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**platform:** `*peal.Platform` 
    
</dd>
</dl>

<dl>
<dd>

**connection:** `*peal.InstagramConnection` 
    
</dd>
</dl>

<dl>
<dd>

**handle:** `*string` 
    
</dd>
</dl>

<dl>
<dd>

**instance:** `*string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Channels.CompleteConnect(WorkspaceID, Platform, request) -> *peal.ConnectOutcome</code></summary>
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

```go
request := &peal.ConnectCallback{
    WorkspaceID: "workspaceId",
    Platform: peal.PlatformX,
    State: "state",
}
_, err := client.Channels.CompleteConnect(
    context.TODO(),
    request,
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

**workspaceID:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**platform:** `*peal.Platform` 
    
</dd>
</dl>

<dl>
<dd>

**code:** `*string` 
    
</dd>
</dl>

<dl>
<dd>

**error_:** `*string` 
    
</dd>
</dl>

<dl>
<dd>

**iss:** `*string` 
    
</dd>
</dl>

<dl>
<dd>

**state:** `string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Channels.ChooseAccounts(WorkspaceID, Platform, request) -> []*peal.Channel</code></summary>
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

```go
request := &peal.ChooseAccounts{
    WorkspaceID: "workspaceId",
    Platform: peal.PlatformX,
    AccountIDs: []string{
        "accountIds",
    },
    Selection: "selection",
}
_, err := client.Channels.ChooseAccounts(
    context.TODO(),
    request,
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

**workspaceID:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**platform:** `*peal.Platform` 
    
</dd>
</dl>

<dl>
<dd>

**accountIDs:** `[]string` 
    
</dd>
</dl>

<dl>
<dd>

**selection:** `string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Channels.Reconnect(WorkspaceID, ChannelID) -> *peal.Authorization</code></summary>
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

```go
request := &peal.ReconnectChannelsRequest{
    WorkspaceID: "workspaceId",
    ChannelID: "channelId",
}
_, err := client.Channels.Reconnect(
    context.TODO(),
    request,
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

**workspaceID:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**channelID:** `string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Channels.Disconnect(WorkspaceID, ChannelID) -> error</code></summary>
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

```go
request := &peal.DisconnectChannelsRequest{
    WorkspaceID: "workspaceId",
    ChannelID: "channelId",
}
err := client.Channels.Disconnect(
    context.TODO(),
    request,
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

**workspaceID:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**channelID:** `string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## posts
<details><summary><code>client.Posts.Drafts(WorkspaceID) -> *peal.DraftPage</code></summary>
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

```go
request := &peal.DraftsPostsRequest{
    WorkspaceID: "workspaceId",
}
_, err := client.Posts.Drafts(
    context.TODO(),
    request,
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

**workspaceID:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**cursor:** `*string` 
    
</dd>
</dl>

<dl>
<dd>

**limit:** `*string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Posts.List(WorkspaceID) -> []*peal.Post</code></summary>
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

```go
request := &peal.ListPostsRequest{
    WorkspaceID: "workspaceId",
    From: "from",
    To: "to",
}
_, err := client.Posts.List(
    context.TODO(),
    request,
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

**workspaceID:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**from:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**to:** `string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Posts.Create(WorkspaceID, request) -> *peal.Post</code></summary>
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

```go
request := &peal.CreatePostsRequest{
    WorkspaceID: "workspaceId",
    Body: &peal.PostDraft{
        ChannelIDs: []string{
            "channelIds",
        },
        Content: &peal.PostContent{
            Media: []*peal.MediaAttachment{
                &peal.MediaAttachment{
                    AltText: "altText",
                    MediaID: "mediaId",
                },
            },
            Overrides: []*peal.TextOverride{
                &peal.TextOverride{
                    ChannelID: "channelId",
                    Text: "text",
                },
            },
            Text: "text",
        },
    },
}
_, err := client.Posts.Create(
    context.TODO(),
    request,
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

**workspaceID:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**request:** `*peal.PostDraft` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Posts.Search(WorkspaceID) -> *peal.PostPage</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Lists the workspace's posts, whatever their state, a page at a time: 20 unless `limit` (at most 100) says otherwise. Every filter given must hold: `status` (draft, scheduled, publishing, finished, cancelled), `outcome` (how a finished post ended, such as `failed` or `partiallyPublished`), `channelId` (posts with a target on that channel), `platform` (posts with a target on a connected channel of that platform), `from` (included) and `to` (excluded), on the scheduled instant, which leave out posts without a time, `createdVia` (`web`, `apiKey` or `application`) and `authorId`. `sort` orders them by creation (`createdDesc`, the default, or `createdAsc`) or by scheduled instant (`scheduledDesc`, `scheduledAsc`, which list only posts with a time). Pass the page's `nextCursor` as `cursor`, with the same filters and sort, for the next page: a cursor marks where its page ended, so posts created, moved or deleted meanwhile make no page repeat or skip one; a cursor of another sort, or none a page gave, is a bad request. Each post comes whole, with its targets, their status, address and failure reason, and `channels` gives the platform of each channel the page names. Needs post:read and channel:read.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```go
request := &peal.SearchPostsRequest{
    WorkspaceID: "workspaceId",
}
_, err := client.Posts.Search(
    context.TODO(),
    request,
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

**workspaceID:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**authorID:** `*string` 
    
</dd>
</dl>

<dl>
<dd>

**channelID:** `*string` 
    
</dd>
</dl>

<dl>
<dd>

**createdVia:** `*peal.PostOriginVia` 
    
</dd>
</dl>

<dl>
<dd>

**cursor:** `*string` 
    
</dd>
</dl>

<dl>
<dd>

**from:** `*string` 
    
</dd>
</dl>

<dl>
<dd>

**limit:** `*string` 
    
</dd>
</dl>

<dl>
<dd>

**outcome:** `*peal.PostOutcome` 
    
</dd>
</dl>

<dl>
<dd>

**platform:** `*peal.Platform` 
    
</dd>
</dl>

<dl>
<dd>

**sort:** `*peal.PostSort` 
    
</dd>
</dl>

<dl>
<dd>

**status:** `*peal.PostStatus` 
    
</dd>
</dl>

<dl>
<dd>

**to:** `*string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Posts.Send(WorkspaceID, request) -> *peal.Post</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Creates a post and sends it to some of the workspace's channels in one call: `when` is `now`, which publishes at once, or `at` an instant, kept with its IANA time zone. It goes through every rule scheduling a draft does (each platform's limits on text, media and options, the account's own, the plan's), and answers every violation at once (PostContentInvalid): nothing is made then. What it publishes reaches the platforms' public, and cannot be taken back from Peal once it is out; until its time, cancel or unschedule it. Send an `Idempotency-Key` header (any text of your choosing, at most 255 characters, such as a UUID) to make a request safe to send again: within 24 hours, the same key with the same body answers the post the first request made, as it now stands, and makes no other; the same key with another body is refused (IdempotencyKeyReused), and answers PostNotFound once that post was deleted. Keys are kept per workspace, as digests. Apart from keys, a post whose content already goes to one of its channels less than 23 hours from its time is refused (DuplicatePost), as a request made twice by mistake would be, unless it says `allowDuplicate: true`; scheduling a draft is not checked. It answers as soon as the post is made, while it publishes, unless `wait` says to wait for the outcome: up to that many seconds (60 at most) for a post that goes out now, the answer is then the post once every channel has its result (`status` `finished`, with its `outcome`, each target `published` with its `permalink` or `failed` with its `failureReason`), or the post as it stands when the time runs out, some targets still `pending` or `publishing`: it goes on publishing, and `GET …/posts/{postId}/outcome` waits for the rest. The answer is 201 either way: the post was made. Needs post:schedule and channel:read, and media:read when it shows media; an OAuth client needs the scope workspace:publish.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```go
request := &peal.NewPost{
    WorkspaceID: "workspaceId",
    ChannelIDs: []string{
        "channelIds",
    },
    Content: &peal.PostContent{
        Media: []*peal.MediaAttachment{
            &peal.MediaAttachment{
                AltText: "altText",
                MediaID: "mediaId",
            },
        },
        Overrides: []*peal.TextOverride{
            &peal.TextOverride{
                ChannelID: "channelId",
                Text: "text",
            },
        },
        Text: "text",
    },
    When: &peal.PostTiming{
        Now: &peal.PostTimingNow{},
    },
}
_, err := client.Posts.Send(
    context.TODO(),
    request,
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

**workspaceID:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**wait:** `*string` 
    
</dd>
</dl>

<dl>
<dd>

**idempotencyKey:** `*string` 
    
</dd>
</dl>

<dl>
<dd>

**allowDuplicate:** `*bool` 
    
</dd>
</dl>

<dl>
<dd>

**channelIDs:** `[]string` 
    
</dd>
</dl>

<dl>
<dd>

**content:** `*peal.PostContent` 
    
</dd>
</dl>

<dl>
<dd>

**options:** `[]*peal.ChannelOptions` 
    
</dd>
</dl>

<dl>
<dd>

**when:** `*peal.PostTiming` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Posts.Bulk(WorkspaceID, request) -> *peal.BulkResult</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Creates and sends up to 50 posts in one request, each as `send` would: one post per item, each with its own channels, content, options and time, so the same content at several times, or at a time of its own on each channel, is several items. Items are taken in order, one at a time, each on its own: one refused keeps none of the others from being made, and nothing is undone. The answer is 200 whenever the request itself was read, even if every item was refused: `items` says, for each by its place in the request, `created` with its post, or `refused` with what `send` would have answered for it alone (its content's violations, unknown channels or media, a time gone by, the plan's limit, a duplicate). A request that cannot be read at all (malformed, no item, more than 50) is 400, and makes nothing. The plan's limits hold across the request: once the month has no room, the items left are refused. Each item is checked against the posts made before it, the request's earlier items included, for the same content on the same channel (DuplicatePost). An `Idempotency-Key` header makes the whole request safe to send again within 24 hours: each item is kept under the key and its place, so the same request sent again answers the posts it made (`replayed`), makes those that were not made the first time if they now can be, and an item that changed under the same key is refused (IdempotencyKeyReused). An item's own `idempotencyKey` is used instead of the header's for that item. Needs post:schedule and channel:read, and media:read for the items that show media; an OAuth client needs the scope workspace:publish.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```go
request := &peal.BulkPosts{
    WorkspaceID: "workspaceId",
    Posts: []*peal.BulkPost{
        &peal.BulkPost{
            ChannelIDs: []string{
                "channelIds",
            },
            Content: &peal.PostContent{
                Media: []*peal.MediaAttachment{
                    &peal.MediaAttachment{
                        AltText: "altText",
                        MediaID: "mediaId",
                    },
                },
                Overrides: []*peal.TextOverride{
                    &peal.TextOverride{
                        ChannelID: "channelId",
                        Text: "text",
                    },
                },
                Text: "text",
            },
            When: &peal.PostTiming{
                Now: &peal.PostTimingNow{},
            },
        },
    },
}
_, err := client.Posts.Bulk(
    context.TODO(),
    request,
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

**workspaceID:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**idempotencyKey:** `*string` 
    
</dd>
</dl>

<dl>
<dd>

**posts:** `[]*peal.BulkPost` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Posts.Import(WorkspaceID, request) -> *peal.ImportResult</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Creates and sends the posts a CSV file lists, one per row, at most 100 rows under its first line, which names the columns, in any order: `text` and `channels` (channel ids separated by spaces, commas or semicolons) are required columns, `at` too (`now`, an instant with its offset such as 2026-11-20T09:00:00Z, or a local time without one such as 2026-11-20 10:00, read in the row's `time_zone`, an IANA zone, UTC if left out); `media` (ids of ready media of the workspace), `allow_duplicate` (`true` or `false`) and `idempotency_key` are optional. Cells follow RFC 4180: a cell with a comma, a quote or a line break is written between double quotes, a quote inside it doubled. The file is checked first, every row, as `validate` checks a post; unless every row is valid, nothing is made, and `rows` says which are `valid`, `refused` (with what `send` would have answered) or `unreadable` (with the cells at fault). `dryRun` stops there even when every row is valid. Otherwise the rows are then made in order as `bulk` makes its items, each `created` or, when something changed since the check or a row repeats an earlier one, `refused`. The answer is 200 once the file was read; a file that cannot be read at all is ImportUnreadable. An `Idempotency-Key` header works as on `bulk`, by row. Needs post:schedule and channel:read, and media:read for rows with media; an OAuth client needs the scope workspace:publish.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```go
request := &peal.PostImport{
    WorkspaceID: "workspaceId",
    Csv: "csv",
}
_, err := client.Posts.Import(
    context.TODO(),
    request,
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

**workspaceID:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**idempotencyKey:** `*string` 
    
</dd>
</dl>

<dl>
<dd>

**csv:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**dryRun:** `*bool` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Posts.Validate(WorkspaceID, request) -> *peal.PostValidation</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Checks a post without making it, and changes nothing: send what `send` takes, or a draft (no `when`). It answers 200 whether or not the post would go through, with `valid` and everything that would refuse it, all at once: per channel, the text the channel receives, counted as its platform counts it against each of its limits, its hashtags, mentions, links and media, and every violation of the platform's rules (text, media formats, sizes, counts and durations, options) and of the account's own where its platform tells them; the channels and media that are not the workspace's; and, when `when` is given, whether the time can be kept, whether the workspace's plan has room, and the channels that already have the same content from another post (`duplicates`, as DuplicatePost tells them; none with `allowDuplicate`). A post that is valid now can still be refused later: a channel disconnected, a plan's month filled meanwhile. Needs post:read and channel:read, and media:read when it shows media.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```go
request := &peal.PostToValidate{
    WorkspaceID: "workspaceId",
    ChannelIDs: []string{
        "channelIds",
    },
    Content: &peal.PostContent{
        Media: []*peal.MediaAttachment{
            &peal.MediaAttachment{
                AltText: "altText",
                MediaID: "mediaId",
            },
        },
        Overrides: []*peal.TextOverride{
            &peal.TextOverride{
                ChannelID: "channelId",
                Text: "text",
            },
        },
        Text: "text",
    },
}
_, err := client.Posts.Validate(
    context.TODO(),
    request,
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

**workspaceID:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**allowDuplicate:** `*bool` 
    
</dd>
</dl>

<dl>
<dd>

**channelIDs:** `[]string` 
    
</dd>
</dl>

<dl>
<dd>

**content:** `*peal.PostContent` 
    
</dd>
</dl>

<dl>
<dd>

**options:** `[]*peal.ChannelOptions` 
    
</dd>
</dl>

<dl>
<dd>

**when:** `*peal.PostTiming` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Posts.Get(WorkspaceID, PostID) -> *peal.Post</code></summary>
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

```go
request := &peal.GetPostsRequest{
    WorkspaceID: "workspaceId",
    PostID: "postId",
}
_, err := client.Posts.Get(
    context.TODO(),
    request,
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

**workspaceID:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**postID:** `string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Posts.Update(WorkspaceID, PostID, request) -> *peal.Post</code></summary>
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

```go
request := &peal.UpdatePostsRequest{
    WorkspaceID: "workspaceId",
    PostID: "postId",
    Body: &peal.PostDraft{
        ChannelIDs: []string{
            "channelIds",
        },
        Content: &peal.PostContent{
            Media: []*peal.MediaAttachment{
                &peal.MediaAttachment{
                    AltText: "altText",
                    MediaID: "mediaId",
                },
            },
            Overrides: []*peal.TextOverride{
                &peal.TextOverride{
                    ChannelID: "channelId",
                    Text: "text",
                },
            },
            Text: "text",
        },
    },
}
_, err := client.Posts.Update(
    context.TODO(),
    request,
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

**workspaceID:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**postID:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**request:** `*peal.PostDraft` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Posts.Discard(WorkspaceID, PostID) -> error</code></summary>
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

```go
request := &peal.DiscardPostsRequest{
    WorkspaceID: "workspaceId",
    PostID: "postId",
}
err := client.Posts.Discard(
    context.TODO(),
    request,
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

**workspaceID:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**postID:** `string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Posts.Outcome(WorkspaceID, PostID) -> *peal.Post</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Answers with a post once it has gone out: it waits up to `wait` seconds (60 at most; none unless given) until every channel has its result, and answers the post then (`status` `finished`), or as it stands when the time runs out, which a client asks again. A draft, a cancelled post and a post scheduled for later than the wait are answered at once. Waiting changes nothing and holds nothing: the post publishes in its own job either way. Needs post:read.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```go
request := &peal.OutcomePostsRequest{
    WorkspaceID: "workspaceId",
    PostID: "postId",
}
_, err := client.Posts.Outcome(
    context.TODO(),
    request,
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

**workspaceID:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**postID:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**wait:** `*string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Posts.Attempts(WorkspaceID, PostID) -> []*peal.PublicationAttempt</code></summary>
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

```go
request := &peal.AttemptsPostsRequest{
    WorkspaceID: "workspaceId",
    PostID: "postId",
}
_, err := client.Posts.Attempts(
    context.TODO(),
    request,
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

**workspaceID:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**postID:** `string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Posts.Schedule(WorkspaceID, PostID, request) -> *peal.Post</code></summary>
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

```go
request := &peal.SchedulePost{
    WorkspaceID: "workspaceId",
    PostID: "postId",
    At: "at",
    ChannelIDs: []string{
        "channelIds",
    },
    TimeZone: "timeZone",
}
_, err := client.Posts.Schedule(
    context.TODO(),
    request,
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

**workspaceID:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**postID:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**at:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**channelIDs:** `[]string` 
    
</dd>
</dl>

<dl>
<dd>

**timeZone:** `string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Posts.Reschedule(WorkspaceID, PostID, request) -> *peal.Post</code></summary>
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

```go
request := &peal.ReschedulePostsRequest{
    WorkspaceID: "workspaceId",
    PostID: "postId",
    Body: &peal.PostSchedule{
        At: "at",
        TimeZone: "timeZone",
    },
}
_, err := client.Posts.Reschedule(
    context.TODO(),
    request,
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

**workspaceID:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**postID:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**request:** `*peal.PostSchedule` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Posts.Unschedule(WorkspaceID, PostID) -> *peal.Post</code></summary>
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

```go
request := &peal.UnschedulePostsRequest{
    WorkspaceID: "workspaceId",
    PostID: "postId",
}
_, err := client.Posts.Unschedule(
    context.TODO(),
    request,
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

**workspaceID:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**postID:** `string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Posts.Repost(WorkspaceID, PostID, TargetID) -> *peal.Post</code></summary>
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

```go
request := &peal.RepostPostsRequest{
    WorkspaceID: "workspaceId",
    PostID: "postId",
    TargetID: "targetId",
}
_, err := client.Posts.Repost(
    context.TODO(),
    request,
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

**workspaceID:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**postID:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**targetID:** `string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Posts.Confirm(WorkspaceID, PostID, TargetID, request) -> *peal.Post</code></summary>
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

```go
request := &peal.ConfirmPostsRequest{
    WorkspaceID: "workspaceId",
    PostID: "postId",
    TargetID: "targetId",
    Body: &peal.TargetConfirmation{
        Published: &peal.TargetConfirmationPublished{},
    },
}
_, err := client.Posts.Confirm(
    context.TODO(),
    request,
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

**workspaceID:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**postID:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**targetID:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**request:** `*peal.TargetConfirmation` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Posts.Cancel(WorkspaceID, PostID) -> *peal.Post</code></summary>
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

```go
request := &peal.CancelPostsRequest{
    WorkspaceID: "workspaceId",
    PostID: "postId",
}
_, err := client.Posts.Cancel(
    context.TODO(),
    request,
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

**workspaceID:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**postID:** `string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## media
<details><summary><code>client.Media.List(WorkspaceID) -> *peal.MediaPage</code></summary>
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

```go
request := &peal.ListMediaRequest{
    WorkspaceID: "workspaceId",
}
_, err := client.Media.List(
    context.TODO(),
    request,
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

**workspaceID:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**cursor:** `*string` 
    
</dd>
</dl>

<dl>
<dd>

**limit:** `*string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Media.Create(WorkspaceID, request) -> *peal.PreparedUpload</code></summary>
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

```go
request := &peal.NewUpload{
    WorkspaceID: "workspaceId",
    ByteSize: 1,
    ContentType: "contentType",
}
_, err := client.Media.Create(
    context.TODO(),
    request,
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

**workspaceID:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**altText:** `*string` 
    
</dd>
</dl>

<dl>
<dd>

**byteSize:** `int` 
    
</dd>
</dl>

<dl>
<dd>

**contentType:** `string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Media.ImportFromURL(WorkspaceID, request) -> *peal.Media</code></summary>
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

```go
request := &peal.MediaImport{
    WorkspaceID: "workspaceId",
    URL: "url",
}
_, err := client.Media.ImportFromURL(
    context.TODO(),
    request,
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

**workspaceID:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**altText:** `*string` 
    
</dd>
</dl>

<dl>
<dd>

**url:** `string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Media.Get(WorkspaceID, MediaID) -> *peal.Media</code></summary>
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

```go
request := &peal.GetMediaRequest{
    WorkspaceID: "workspaceId",
    MediaID: "mediaId",
}
_, err := client.Media.Get(
    context.TODO(),
    request,
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

**workspaceID:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**mediaID:** `string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Media.Delete(WorkspaceID, MediaID) -> error</code></summary>
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

```go
request := &peal.DeleteMediaRequest{
    WorkspaceID: "workspaceId",
    MediaID: "mediaId",
}
err := client.Media.Delete(
    context.TODO(),
    request,
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

**workspaceID:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**mediaID:** `string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Media.Describe(WorkspaceID, MediaID, request) -> *peal.Media</code></summary>
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

```go
request := &peal.MediaDescription{
    WorkspaceID: "workspaceId",
    MediaID: "mediaId",
}
_, err := client.Media.Describe(
    context.TODO(),
    request,
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

**workspaceID:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**mediaID:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**altText:** `*string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Media.Complete(WorkspaceID, MediaID) -> *peal.Media</code></summary>
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

```go
request := &peal.CompleteMediaRequest{
    WorkspaceID: "workspaceId",
    MediaID: "mediaId",
}
_, err := client.Media.Complete(
    context.TODO(),
    request,
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

**workspaceID:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**mediaID:** `string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Media.Usage(WorkspaceID, MediaID) -> *peal.MediaUsage</code></summary>
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

```go
request := &peal.UsageMediaRequest{
    WorkspaceID: "workspaceId",
    MediaID: "mediaId",
}
_, err := client.Media.Usage(
    context.TODO(),
    request,
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

**workspaceID:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**mediaID:** `string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## notices
<details><summary><code>client.Notices.List() -> *peal.NoticePage</code></summary>
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

```go
request := &peal.ListNoticesRequest{}
_, err := client.Notices.List(
    context.TODO(),
    request,
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

**cursor:** `*string` 
    
</dd>
</dl>

<dl>
<dd>

**limit:** `*string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Notices.Unread() -> *peal.UnreadNotices</code></summary>
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

```go
_, err := client.Notices.Unread(
    context.TODO(),
)
```
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Notices.MarkRead(request) -> *peal.UnreadNotices</code></summary>
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

```go
request := &peal.MarkNoticesRead{
    IDs: []string{
        "ids",
    },
}
_, err := client.Notices.MarkRead(
    context.TODO(),
    request,
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

**ids:** `[]string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Notices.MarkAllRead() -> *peal.UnreadNotices</code></summary>
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

```go
_, err := client.Notices.MarkAllRead(
    context.TODO(),
)
```
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## notificationPreferences
<details><summary><code>client.NotificationPreferences.Get() -> *peal.NotificationPreferences</code></summary>
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

```go
_, err := client.NotificationPreferences.Get(
    context.TODO(),
)
```
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.NotificationPreferences.Update(request) -> *peal.NotificationPreferences</code></summary>
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

```go
request := &peal.NotificationPreferencesChange{}
_, err := client.NotificationPreferences.Update(
    context.TODO(),
    request,
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

**email:** `*peal.NotificationPreferencesChangeEmail` 
    
</dd>
</dl>

<dl>
<dd>

**everyPost:** `*bool` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## assistant
<details><summary><code>client.Assistant.Status(WorkspaceID) -> *peal.AssistantStatus</code></summary>
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

```go
request := &peal.StatusAssistantRequest{
    WorkspaceID: "workspaceId",
}
_, err := client.Assistant.Status(
    context.TODO(),
    request,
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

**workspaceID:** `string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Assistant.Suggest(WorkspaceID, request) -> *peal.Suggestion</code></summary>
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

```go
request := &peal.SuggestionRequest{
    WorkspaceID: "workspaceId",
    Action: &peal.AssistantAction{
        Rewrite: &peal.AssistantActionRewrite{
            Tone: peal.AssistantToneProfessional,
        },
    },
    Text: "text",
}
_, err := client.Assistant.Suggest(
    context.TODO(),
    request,
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

**workspaceID:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**action:** `*peal.AssistantAction` 
    
</dd>
</dl>

<dl>
<dd>

**text:** `string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## members
<details><summary><code>client.Members.List(WorkspaceID) -> []*peal.WorkspaceMember</code></summary>
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

```go
request := &peal.ListMembersRequest{
    WorkspaceID: "workspaceId",
}
_, err := client.Members.List(
    context.TODO(),
    request,
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

**workspaceID:** `string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## invitations
<details><summary><code>client.Invitations.List(WorkspaceID) -> []*peal.Invitation</code></summary>
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

```go
request := &peal.ListInvitationsRequest{
    WorkspaceID: "workspaceId",
}
_, err := client.Invitations.List(
    context.TODO(),
    request,
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

**workspaceID:** `string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Invitations.Create(WorkspaceID, request) -> *peal.Invitation</code></summary>
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

```go
request := &peal.NewInvitation{
    WorkspaceID: "workspaceId",
    Email: "email",
    Role: peal.RoleOwner,
}
_, err := client.Invitations.Create(
    context.TODO(),
    request,
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

**workspaceID:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**email:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**role:** `peal.Role` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Invitations.Revoke(WorkspaceID, InvitationID) -> error</code></summary>
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

```go
request := &peal.RevokeInvitationsRequest{
    WorkspaceID: "workspaceId",
    InvitationID: "invitationId",
}
err := client.Invitations.Revoke(
    context.TODO(),
    request,
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

**workspaceID:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**invitationID:** `string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## billing
<details><summary><code>client.Billing.Get(WorkspaceID) -> *peal.Billing</code></summary>
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

```go
request := &peal.GetBillingRequest{
    WorkspaceID: "workspaceId",
}
_, err := client.Billing.Get(
    context.TODO(),
    request,
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

**workspaceID:** `string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Billing.Standing(WorkspaceID) -> *peal.Standing</code></summary>
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

```go
request := &peal.StandingBillingRequest{
    WorkspaceID: "workspaceId",
}
_, err := client.Billing.Standing(
    context.TODO(),
    request,
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

**workspaceID:** `string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## analytics
<details><summary><code>client.Analytics.Summary(WorkspaceID) -> *peal.AnalyticsSummary</code></summary>
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

```go
request := &peal.SummaryAnalyticsRequest{
    WorkspaceID: "workspaceId",
    From: "from",
    TimeZone: "timeZone",
    To: "to",
}
_, err := client.Analytics.Summary(
    context.TODO(),
    request,
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

**workspaceID:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**from:** `peal.CalendarDay` 
    
</dd>
</dl>

<dl>
<dd>

**timeZone:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**to:** `peal.CalendarDay` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Analytics.Post(WorkspaceID, PostID) -> *peal.PostAnalytics</code></summary>
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

```go
request := &peal.PostAnalyticsRequest{
    WorkspaceID: "workspaceId",
    PostID: "postId",
}
_, err := client.Analytics.Post(
    context.TODO(),
    request,
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

**workspaceID:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**postID:** `string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## tiktok
<details><summary><code>client.Tiktok.Creator(WorkspaceID, ChannelID) -> *peal.TikTokAccount</code></summary>
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

```go
request := &peal.CreatorTiktokRequest{
    WorkspaceID: "workspaceId",
    ChannelID: "channelId",
}
_, err := client.Tiktok.Creator(
    context.TODO(),
    request,
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

**workspaceID:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**channelID:** `string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## webhooks
<details><summary><code>client.Webhooks.List(WorkspaceID) -> []*peal.WebhookEndpoint</code></summary>
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

```go
request := &peal.ListWebhooksRequest{
    WorkspaceID: "workspaceId",
}
_, err := client.Webhooks.List(
    context.TODO(),
    request,
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

**workspaceID:** `string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Webhooks.Create(WorkspaceID, request) -> *peal.WebhookEndpointSecret</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Adds a webhook endpoint to the workspace, and answers with its signing secret, which is not shown again. Its address must be HTTPS on the default port, on a public host, without credentials; Peal follows no redirect from it. A workspace has 10 endpoints at most, whatever its plan. Needs webhook:manage.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```go
request := &peal.NewWebhookEndpoint{
    WorkspaceID: "workspaceId",
    EventTypes: []peal.SubscribableWebhookEventType{
        peal.SubscribableWebhookEventTypePostScheduled,
    },
    URL: "url",
}
_, err := client.Webhooks.Create(
    context.TODO(),
    request,
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

**workspaceID:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**description:** `*string` 
    
</dd>
</dl>

<dl>
<dd>

**enabled:** `*bool` 
    
</dd>
</dl>

<dl>
<dd>

**eventTypes:** `[]peal.SubscribableWebhookEventType` 
    
</dd>
</dl>

<dl>
<dd>

**url:** `string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Webhooks.Get(WorkspaceID, EndpointID) -> *peal.WebhookEndpoint</code></summary>
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

```go
request := &peal.GetWebhooksRequest{
    WorkspaceID: "workspaceId",
    EndpointID: "endpointId",
}
_, err := client.Webhooks.Get(
    context.TODO(),
    request,
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

**workspaceID:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**endpointID:** `string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Webhooks.Delete(WorkspaceID, EndpointID) -> error</code></summary>
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

```go
request := &peal.DeleteWebhooksRequest{
    WorkspaceID: "workspaceId",
    EndpointID: "endpointId",
}
err := client.Webhooks.Delete(
    context.TODO(),
    request,
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

**workspaceID:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**endpointID:** `string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Webhooks.Update(WorkspaceID, EndpointID, request) -> *peal.WebhookEndpoint</code></summary>
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

```go
request := &peal.WebhookEndpointChange{
    WorkspaceID: "workspaceId",
    EndpointID: "endpointId",
}
_, err := client.Webhooks.Update(
    context.TODO(),
    request,
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

**workspaceID:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**endpointID:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**description:** `*string` 
    
</dd>
</dl>

<dl>
<dd>

**enabled:** `*bool` 
    
</dd>
</dl>

<dl>
<dd>

**eventTypes:** `[]peal.SubscribableWebhookEventType` 
    
</dd>
</dl>

<dl>
<dd>

**url:** `*string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Webhooks.RotateSecret(WorkspaceID, EndpointID) -> *peal.WebhookEndpointSecret</code></summary>
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

```go
request := &peal.RotateSecretWebhooksRequest{
    WorkspaceID: "workspaceId",
    EndpointID: "endpointId",
}
_, err := client.Webhooks.RotateSecret(
    context.TODO(),
    request,
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

**workspaceID:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**endpointID:** `string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Webhooks.SendTest(WorkspaceID, EndpointID) -> *peal.WebhookDelivery</code></summary>
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

```go
request := &peal.SendTestWebhooksRequest{
    WorkspaceID: "workspaceId",
    EndpointID: "endpointId",
}
_, err := client.Webhooks.SendTest(
    context.TODO(),
    request,
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

**workspaceID:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**endpointID:** `string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Webhooks.ListDeliveries(WorkspaceID, EndpointID) -> *peal.WebhookDeliveryPage</code></summary>
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

```go
request := &peal.ListDeliveriesWebhooksRequest{
    WorkspaceID: "workspaceId",
    EndpointID: "endpointId",
}
_, err := client.Webhooks.ListDeliveries(
    context.TODO(),
    request,
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

**workspaceID:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**endpointID:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**cursor:** `*string` 
    
</dd>
</dl>

<dl>
<dd>

**limit:** `*string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Webhooks.Redeliver(WorkspaceID, EndpointID, DeliveryID) -> *peal.WebhookDelivery</code></summary>
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

```go
request := &peal.RedeliverWebhooksRequest{
    WorkspaceID: "workspaceId",
    EndpointID: "endpointId",
    DeliveryID: "deliveryId",
}
_, err := client.Webhooks.Redeliver(
    context.TODO(),
    request,
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

**workspaceID:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**endpointID:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**deliveryID:** `string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## activity
<details><summary><code>client.Activity.List(WorkspaceID) -> *peal.ActivityPage</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Lists the requests that asked to change something in the workspace, newest first, 30 a page unless `limit` (at most 100) says otherwise: who asked (a member or an API key), how they authenticated, the key or the application it came through, the operation, the ids its path named, the status answered and, when it was refused or failed, the error's code. Requests that only read are not kept, and neither is anything a request or its answer carried. `operation` keeps one operation (`posts.schedule`), `actor` what one member (a user id) or one API key (its id) asked for. Pass the page's `nextCursor` as `cursor` for the next one. An event is kept 90 days. Needs activity:read, which owners hold.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```go
request := &peal.ListActivityRequest{
    WorkspaceID: "workspaceId",
}
_, err := client.Activity.List(
    context.TODO(),
    request,
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

**workspaceID:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**actor:** `*string` 
    
</dd>
</dl>

<dl>
<dd>

**cursor:** `*string` 
    
</dd>
</dl>

<dl>
<dd>

**limit:** `*string` 
    
</dd>
</dl>

<dl>
<dd>

**operation:** `*string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

