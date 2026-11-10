# Reference
## system
<details><summary><code>client.System.<a href="/src/Peal/System/SystemClient.cs">HealthAsync</a>() -> WithRawResponseTask</code></summary>
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

```csharp
await client.System.HealthAsync();
```
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.System.<a href="/src/Peal/System/SystemClient.cs">ReadyAsync</a>() -> WithRawResponseTask</code></summary>
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

```csharp
await client.System.ReadyAsync();
```
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## session
<details><summary><code>client.Session.<a href="/src/Peal/Session/SessionClient.cs">MeAsync</a>() -> WithRawResponseTask&lt;Me&gt;</code></summary>
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

```csharp
await client.Session.MeAsync();
```
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## apiKeys
<details><summary><code>client.ApiKeys.<a href="/src/Peal/ApiKeys/ApiKeysClient.cs">ListAsync</a>(ListApiKeysRequest { ... }) -> WithRawResponseTask&lt;IEnumerable&lt;ApiKey&gt;&gt;</code></summary>
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

```csharp
await client.ApiKeys.ListAsync(new ListApiKeysRequest { WorkspaceId = "workspaceId" });
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

**request:** `ListApiKeysRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.ApiKeys.<a href="/src/Peal/ApiKeys/ApiKeysClient.cs">CreateAsync</a>(NewApiKey { ... }) -> WithRawResponseTask&lt;CreatedApiKey&gt;</code></summary>
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

```csharp
await client.ApiKeys.CreateAsync(
    new NewApiKey
    {
        WorkspaceId = "workspaceId",
        Name = "name",
        Permissions = new List<Permission>() { Permission.AnalyticsRead },
    }
);
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

**request:** `NewApiKey` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.ApiKeys.<a href="/src/Peal/ApiKeys/ApiKeysClient.cs">RevokeAsync</a>(RevokeApiKeysRequest { ... }) -> WithRawResponseTask</code></summary>
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

```csharp
await client.ApiKeys.RevokeAsync(
    new RevokeApiKeysRequest { WorkspaceId = "workspaceId", ApiKeyId = "apiKeyId" }
);
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

**request:** `RevokeApiKeysRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## channels
<details><summary><code>client.Channels.<a href="/src/Peal/Channels/ChannelsClient.cs">ListAsync</a>(ListChannelsRequest { ... }) -> WithRawResponseTask&lt;IEnumerable&lt;Channel&gt;&gt;</code></summary>
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

```csharp
await client.Channels.ListAsync(new ListChannelsRequest { WorkspaceId = "workspaceId" });
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

**request:** `ListChannelsRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Channels.<a href="/src/Peal/Channels/ChannelsClient.cs">PlatformsAsync</a>(PlatformsChannelsRequest { ... }) -> WithRawResponseTask&lt;ConnectablePlatforms&gt;</code></summary>
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

```csharp
await client.Channels.PlatformsAsync(new PlatformsChannelsRequest { WorkspaceId = "workspaceId" });
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

**request:** `PlatformsChannelsRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Channels.<a href="/src/Peal/Channels/ChannelsClient.cs">ConnectAsync</a>(ConnectChannel { ... }) -> WithRawResponseTask&lt;Authorization&gt;</code></summary>
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

```csharp
await client.Channels.ConnectAsync(
    new ConnectChannel { WorkspaceId = "workspaceId", Platform = Platform.X }
);
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

**request:** `ConnectChannel` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Channels.<a href="/src/Peal/Channels/ChannelsClient.cs">CompleteConnectAsync</a>(ConnectCallback { ... }) -> WithRawResponseTask&lt;ConnectOutcome&gt;</code></summary>
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

```csharp
await client.Channels.CompleteConnectAsync(
    new ConnectCallback
    {
        WorkspaceId = "workspaceId",
        Platform = Platform.X,
        State = "state",
    }
);
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

**request:** `ConnectCallback` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Channels.<a href="/src/Peal/Channels/ChannelsClient.cs">ChooseAccountsAsync</a>(ChooseAccounts { ... }) -> WithRawResponseTask&lt;IEnumerable&lt;Channel&gt;&gt;</code></summary>
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

```csharp
await client.Channels.ChooseAccountsAsync(
    new ChooseAccounts
    {
        WorkspaceId = "workspaceId",
        Platform = Platform.X,
        AccountIds = new List<string>() { "accountIds" },
        Selection = "selection",
    }
);
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

**request:** `ChooseAccounts` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Channels.<a href="/src/Peal/Channels/ChannelsClient.cs">ReconnectAsync</a>(ReconnectChannelsRequest { ... }) -> WithRawResponseTask&lt;Authorization&gt;</code></summary>
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

```csharp
await client.Channels.ReconnectAsync(
    new ReconnectChannelsRequest { WorkspaceId = "workspaceId", ChannelId = "channelId" }
);
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

**request:** `ReconnectChannelsRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Channels.<a href="/src/Peal/Channels/ChannelsClient.cs">DisconnectAsync</a>(DisconnectChannelsRequest { ... }) -> WithRawResponseTask</code></summary>
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

```csharp
await client.Channels.DisconnectAsync(
    new DisconnectChannelsRequest { WorkspaceId = "workspaceId", ChannelId = "channelId" }
);
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

**request:** `DisconnectChannelsRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## posts
<details><summary><code>client.Posts.<a href="/src/Peal/Posts/PostsClient.cs">DraftsAsync</a>(DraftsPostsRequest { ... }) -> WithRawResponseTask&lt;DraftPage&gt;</code></summary>
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

```csharp
await client.Posts.DraftsAsync(new DraftsPostsRequest { WorkspaceId = "workspaceId" });
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

**request:** `DraftsPostsRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Posts.<a href="/src/Peal/Posts/PostsClient.cs">ListAsync</a>(ListPostsRequest { ... }) -> WithRawResponseTask&lt;IEnumerable&lt;Post&gt;&gt;</code></summary>
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

```csharp
await client.Posts.ListAsync(
    new ListPostsRequest
    {
        WorkspaceId = "workspaceId",
        From = "from",
        To = "to",
    }
);
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

**request:** `ListPostsRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Posts.<a href="/src/Peal/Posts/PostsClient.cs">CreateAsync</a>(CreatePostsRequest { ... }) -> WithRawResponseTask&lt;Post&gt;</code></summary>
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

```csharp
await client.Posts.CreateAsync(
    new CreatePostsRequest
    {
        WorkspaceId = "workspaceId",
        Body = new PostDraft
        {
            ChannelIds = new List<string>() { "channelIds" },
            Content = new PostContent
            {
                Media = new List<MediaAttachment>()
                {
                    new MediaAttachment { AltText = "altText", MediaId = "mediaId" },
                },
                Overrides = new List<TextOverride>()
                {
                    new TextOverride { ChannelId = "channelId", Text = "text" },
                },
                Text = "text",
            },
        },
    }
);
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

**request:** `CreatePostsRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Posts.<a href="/src/Peal/Posts/PostsClient.cs">GetAsync</a>(GetPostsRequest { ... }) -> WithRawResponseTask&lt;Post&gt;</code></summary>
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

```csharp
await client.Posts.GetAsync(new GetPostsRequest { WorkspaceId = "workspaceId", PostId = "postId" });
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

**request:** `GetPostsRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Posts.<a href="/src/Peal/Posts/PostsClient.cs">UpdateAsync</a>(UpdatePostsRequest { ... }) -> WithRawResponseTask&lt;Post&gt;</code></summary>
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

```csharp
await client.Posts.UpdateAsync(
    new UpdatePostsRequest
    {
        WorkspaceId = "workspaceId",
        PostId = "postId",
        Body = new PostDraft
        {
            ChannelIds = new List<string>() { "channelIds" },
            Content = new PostContent
            {
                Media = new List<MediaAttachment>()
                {
                    new MediaAttachment { AltText = "altText", MediaId = "mediaId" },
                },
                Overrides = new List<TextOverride>()
                {
                    new TextOverride { ChannelId = "channelId", Text = "text" },
                },
                Text = "text",
            },
        },
    }
);
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

**request:** `UpdatePostsRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Posts.<a href="/src/Peal/Posts/PostsClient.cs">DiscardAsync</a>(DiscardPostsRequest { ... }) -> WithRawResponseTask</code></summary>
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

```csharp
await client.Posts.DiscardAsync(
    new DiscardPostsRequest { WorkspaceId = "workspaceId", PostId = "postId" }
);
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

**request:** `DiscardPostsRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Posts.<a href="/src/Peal/Posts/PostsClient.cs">AttemptsAsync</a>(AttemptsPostsRequest { ... }) -> WithRawResponseTask&lt;IEnumerable&lt;PublicationAttempt&gt;&gt;</code></summary>
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

```csharp
await client.Posts.AttemptsAsync(
    new AttemptsPostsRequest { WorkspaceId = "workspaceId", PostId = "postId" }
);
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

**request:** `AttemptsPostsRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Posts.<a href="/src/Peal/Posts/PostsClient.cs">ScheduleAsync</a>(SchedulePost { ... }) -> WithRawResponseTask&lt;Post&gt;</code></summary>
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

```csharp
await client.Posts.ScheduleAsync(
    new SchedulePost
    {
        WorkspaceId = "workspaceId",
        PostId = "postId",
        At = "at",
        ChannelIds = new List<string>() { "channelIds" },
        TimeZone = "timeZone",
    }
);
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

**request:** `SchedulePost` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Posts.<a href="/src/Peal/Posts/PostsClient.cs">RescheduleAsync</a>(ReschedulePostsRequest { ... }) -> WithRawResponseTask&lt;Post&gt;</code></summary>
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

```csharp
await client.Posts.RescheduleAsync(
    new ReschedulePostsRequest
    {
        WorkspaceId = "workspaceId",
        PostId = "postId",
        Body = new PostSchedule { At = "at", TimeZone = "timeZone" },
    }
);
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

**request:** `ReschedulePostsRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Posts.<a href="/src/Peal/Posts/PostsClient.cs">UnscheduleAsync</a>(UnschedulePostsRequest { ... }) -> WithRawResponseTask&lt;Post&gt;</code></summary>
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

```csharp
await client.Posts.UnscheduleAsync(
    new UnschedulePostsRequest { WorkspaceId = "workspaceId", PostId = "postId" }
);
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

**request:** `UnschedulePostsRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Posts.<a href="/src/Peal/Posts/PostsClient.cs">RepostAsync</a>(RepostPostsRequest { ... }) -> WithRawResponseTask&lt;Post&gt;</code></summary>
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

```csharp
await client.Posts.RepostAsync(
    new RepostPostsRequest
    {
        WorkspaceId = "workspaceId",
        PostId = "postId",
        TargetId = "targetId",
    }
);
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

**request:** `RepostPostsRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Posts.<a href="/src/Peal/Posts/PostsClient.cs">ConfirmAsync</a>(ConfirmPostsRequest { ... }) -> WithRawResponseTask&lt;Post&gt;</code></summary>
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

```csharp
await client.Posts.ConfirmAsync(
    new ConfirmPostsRequest
    {
        WorkspaceId = "workspaceId",
        PostId = "postId",
        TargetId = "targetId",
        Body = new TargetConfirmation(
            new TargetConfirmation.Published(new TargetConfirmationPublished { Permalink = null })
        ),
    }
);
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

**request:** `ConfirmPostsRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Posts.<a href="/src/Peal/Posts/PostsClient.cs">CancelAsync</a>(CancelPostsRequest { ... }) -> WithRawResponseTask&lt;Post&gt;</code></summary>
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

```csharp
await client.Posts.CancelAsync(
    new CancelPostsRequest { WorkspaceId = "workspaceId", PostId = "postId" }
);
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

**request:** `CancelPostsRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## media
<details><summary><code>client.Media.<a href="/src/Peal/Media/MediaClient.cs">ListAsync</a>(ListMediaRequest { ... }) -> WithRawResponseTask&lt;MediaPage&gt;</code></summary>
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

```csharp
await client.Media.ListAsync(new ListMediaRequest { WorkspaceId = "workspaceId" });
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

**request:** `ListMediaRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Media.<a href="/src/Peal/Media/MediaClient.cs">CreateAsync</a>(NewUpload { ... }) -> WithRawResponseTask&lt;PreparedUpload&gt;</code></summary>
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

```csharp
await client.Media.CreateAsync(
    new NewUpload
    {
        WorkspaceId = "workspaceId",
        ByteSize = 1,
        ContentType = "contentType",
    }
);
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

**request:** `NewUpload` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Media.<a href="/src/Peal/Media/MediaClient.cs">GetAsync</a>(GetMediaRequest { ... }) -> WithRawResponseTask&lt;Media&gt;</code></summary>
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

```csharp
await client.Media.GetAsync(
    new GetMediaRequest { WorkspaceId = "workspaceId", MediaId = "mediaId" }
);
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

**request:** `GetMediaRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Media.<a href="/src/Peal/Media/MediaClient.cs">DeleteAsync</a>(DeleteMediaRequest { ... }) -> WithRawResponseTask</code></summary>
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

```csharp
await client.Media.DeleteAsync(
    new DeleteMediaRequest { WorkspaceId = "workspaceId", MediaId = "mediaId" }
);
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

**request:** `DeleteMediaRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Media.<a href="/src/Peal/Media/MediaClient.cs">DescribeAsync</a>(MediaDescription { ... }) -> WithRawResponseTask&lt;Media&gt;</code></summary>
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

```csharp
await client.Media.DescribeAsync(
    new MediaDescription
    {
        WorkspaceId = "workspaceId",
        MediaId = "mediaId",
        AltText = null,
    }
);
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

**request:** `MediaDescription` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Media.<a href="/src/Peal/Media/MediaClient.cs">CompleteAsync</a>(CompleteMediaRequest { ... }) -> WithRawResponseTask&lt;Media&gt;</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Checks that the file reached the store with the declared size and type, joining its parts first, then probes it: the media is ready, or stays uploaded with why it could not be probed. Calling it again is safe, and probes an uploaded file again. Needs media:upload.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```csharp
await client.Media.CompleteAsync(
    new CompleteMediaRequest { WorkspaceId = "workspaceId", MediaId = "mediaId" }
);
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

**request:** `CompleteMediaRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Media.<a href="/src/Peal/Media/MediaClient.cs">UsageAsync</a>(UsageMediaRequest { ... }) -> WithRawResponseTask&lt;MediaUsage&gt;</code></summary>
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

```csharp
await client.Media.UsageAsync(
    new UsageMediaRequest { WorkspaceId = "workspaceId", MediaId = "mediaId" }
);
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

**request:** `UsageMediaRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## notices
<details><summary><code>client.Notices.<a href="/src/Peal/Notices/NoticesClient.cs">ListAsync</a>(ListNoticesRequest { ... }) -> WithRawResponseTask&lt;NoticePage&gt;</code></summary>
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

```csharp
await client.Notices.ListAsync(new ListNoticesRequest());
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

**request:** `ListNoticesRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Notices.<a href="/src/Peal/Notices/NoticesClient.cs">UnreadAsync</a>() -> WithRawResponseTask&lt;UnreadNotices&gt;</code></summary>
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

```csharp
await client.Notices.UnreadAsync();
```
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Notices.<a href="/src/Peal/Notices/NoticesClient.cs">MarkReadAsync</a>(MarkNoticesRead { ... }) -> WithRawResponseTask&lt;UnreadNotices&gt;</code></summary>
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

```csharp
await client.Notices.MarkReadAsync(new MarkNoticesRead { Ids = new List<string>() { "ids" } });
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

**request:** `MarkNoticesRead` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Notices.<a href="/src/Peal/Notices/NoticesClient.cs">MarkAllReadAsync</a>() -> WithRawResponseTask&lt;UnreadNotices&gt;</code></summary>
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

```csharp
await client.Notices.MarkAllReadAsync();
```
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## notificationPreferences
<details><summary><code>client.NotificationPreferences.<a href="/src/Peal/NotificationPreferences/NotificationPreferencesClient.cs">GetAsync</a>() -> WithRawResponseTask&lt;NotificationPreferences&gt;</code></summary>
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

```csharp
await client.NotificationPreferences.GetAsync();
```
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.NotificationPreferences.<a href="/src/Peal/NotificationPreferences/NotificationPreferencesClient.cs">UpdateAsync</a>(NotificationPreferencesChange { ... }) -> WithRawResponseTask&lt;NotificationPreferences&gt;</code></summary>
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

```csharp
await client.NotificationPreferences.UpdateAsync(new NotificationPreferencesChange());
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

**request:** `NotificationPreferencesChange` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## assistant
<details><summary><code>client.Assistant.<a href="/src/Peal/Assistant/AssistantClient.cs">StatusAsync</a>(StatusAssistantRequest { ... }) -> WithRawResponseTask&lt;AssistantStatus&gt;</code></summary>
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

```csharp
await client.Assistant.StatusAsync(new StatusAssistantRequest { WorkspaceId = "workspaceId" });
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

**request:** `StatusAssistantRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Assistant.<a href="/src/Peal/Assistant/AssistantClient.cs">SuggestAsync</a>(SuggestionRequest { ... }) -> WithRawResponseTask&lt;Suggestion&gt;</code></summary>
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

```csharp
await client.Assistant.SuggestAsync(
    new SuggestionRequest
    {
        WorkspaceId = "workspaceId",
        Action = new AssistantAction(
            new AssistantAction.Rewrite(
                new AssistantActionRewrite { Tone = AssistantTone.Professional }
            )
        ),
        Text = "text",
    }
);
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

**request:** `SuggestionRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## members
<details><summary><code>client.Members.<a href="/src/Peal/Members/MembersClient.cs">ListAsync</a>(ListMembersRequest { ... }) -> WithRawResponseTask&lt;IEnumerable&lt;WorkspaceMember&gt;&gt;</code></summary>
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

```csharp
await client.Members.ListAsync(new ListMembersRequest { WorkspaceId = "workspaceId" });
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

**request:** `ListMembersRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## invitations
<details><summary><code>client.Invitations.<a href="/src/Peal/Invitations/InvitationsClient.cs">ListAsync</a>(ListInvitationsRequest { ... }) -> WithRawResponseTask&lt;IEnumerable&lt;Invitation&gt;&gt;</code></summary>
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

```csharp
await client.Invitations.ListAsync(new ListInvitationsRequest { WorkspaceId = "workspaceId" });
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

**request:** `ListInvitationsRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Invitations.<a href="/src/Peal/Invitations/InvitationsClient.cs">CreateAsync</a>(NewInvitation { ... }) -> WithRawResponseTask&lt;Invitation&gt;</code></summary>
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

```csharp
await client.Invitations.CreateAsync(
    new NewInvitation
    {
        WorkspaceId = "workspaceId",
        Email = "email",
        Role = Role.Owner,
    }
);
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

**request:** `NewInvitation` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Invitations.<a href="/src/Peal/Invitations/InvitationsClient.cs">RevokeAsync</a>(RevokeInvitationsRequest { ... }) -> WithRawResponseTask</code></summary>
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

```csharp
await client.Invitations.RevokeAsync(
    new RevokeInvitationsRequest { WorkspaceId = "workspaceId", InvitationId = "invitationId" }
);
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

**request:** `RevokeInvitationsRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## billing
<details><summary><code>client.Billing.<a href="/src/Peal/Billing/BillingClient.cs">GetAsync</a>(GetBillingRequest { ... }) -> WithRawResponseTask&lt;Billing&gt;</code></summary>
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

```csharp
await client.Billing.GetAsync(new GetBillingRequest { WorkspaceId = "workspaceId" });
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

**request:** `GetBillingRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## analytics
<details><summary><code>client.Analytics.<a href="/src/Peal/Analytics/AnalyticsClient.cs">SummaryAsync</a>(SummaryAnalyticsRequest { ... }) -> WithRawResponseTask&lt;AnalyticsSummary&gt;</code></summary>
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

```csharp
await client.Analytics.SummaryAsync(
    new SummaryAnalyticsRequest
    {
        WorkspaceId = "workspaceId",
        From = "from",
        TimeZone = "timeZone",
        To = "to",
    }
);
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

**request:** `SummaryAnalyticsRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Analytics.<a href="/src/Peal/Analytics/AnalyticsClient.cs">PostAsync</a>(PostAnalyticsRequest { ... }) -> WithRawResponseTask&lt;PostAnalytics&gt;</code></summary>
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

```csharp
await client.Analytics.PostAsync(
    new PostAnalyticsRequest { WorkspaceId = "workspaceId", PostId = "postId" }
);
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

**request:** `PostAnalyticsRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## tiktok
<details><summary><code>client.Tiktok.<a href="/src/Peal/Tiktok/TiktokClient.cs">CreatorAsync</a>(CreatorTiktokRequest { ... }) -> WithRawResponseTask&lt;TikTokAccount&gt;</code></summary>
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

```csharp
await client.Tiktok.CreatorAsync(
    new CreatorTiktokRequest { WorkspaceId = "workspaceId", ChannelId = "channelId" }
);
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

**request:** `CreatorTiktokRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## capabilities
<details><summary><code>client.Capabilities.<a href="/src/Peal/Capabilities/CapabilitiesClient.cs">PlatformsAsync</a>(PlatformsCapabilitiesRequest { ... }) -> WithRawResponseTask&lt;IEnumerable&lt;PlatformCapabilities&gt;&gt;</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Describes what a post may hold on every platform, in Peal's order, whether or not the workspace has a channel there: how its text is counted and limited, the images and videos it takes, its options field by field, the lookups that answer their values, and whether Peal reads each post's counts. These are the rules Peal checks when a post is scheduled; a null limit is one Peal does not check, which the platform may still apply. Needs channel:read.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```csharp
await client.Capabilities.PlatformsAsync(
    new PlatformsCapabilitiesRequest { WorkspaceId = "workspaceId" }
);
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

**request:** `PlatformsCapabilitiesRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Capabilities.<a href="/src/Peal/Capabilities/CapabilitiesClient.cs">ChannelAsync</a>(ChannelCapabilitiesRequest { ... }) -> WithRawResponseTask&lt;ChannelCapabilities&gt;</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Describes what a post on this channel may hold: its platform's capabilities, and what its own account narrows in them, read from the platform now (a TikTok creator's audiences, the interactions they turned off, their longest video). When the platform cannot be asked, `account` says why and the platform's capabilities are answered alone. Needs channel:read.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```csharp
await client.Capabilities.ChannelAsync(
    new ChannelCapabilitiesRequest { WorkspaceId = "workspaceId", ChannelId = "channelId" }
);
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

**request:** `ChannelCapabilitiesRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## lookups
<details><summary><code>client.Lookups.<a href="/src/Peal/Lookups/LookupsClient.cs">ListAsync</a>(ListLookupsRequest { ... }) -> WithRawResponseTask&lt;IEnumerable&lt;LookupDescription&gt;&gt;</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Lists the lookups the channel has: what its platform tells about the account that a post's options refer to, such as the categories a YouTube video can be filed under or the boards a Pinterest Pin can be saved to. Each says the input it takes and the options it fills. Empty for a platform without lookups. Needs channel:read.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```csharp
await client.Lookups.ListAsync(
    new ListLookupsRequest { WorkspaceId = "workspaceId", ChannelId = "channelId" }
);
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

**request:** `ListLookupsRequest` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Lookups.<a href="/src/Peal/Lookups/LookupsClient.cs">RunAsync</a>(LookupInput { ... }) -> WithRawResponseTask&lt;LookupResult&gt;</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Runs one of the channel's lookups: asks the platform now, with the channel's token, and answers a page of items tagged by the lookup's name. It changes nothing, on Peal or on the platform. A paged lookup names the next page in `nextCursor`, to send back as `cursor`. A name the channel's platform does not have is LookupNotFound; an input the lookup does not take, LookupInputInvalid; a channel turned off or to reconnect, ChannelCannotPost; a platform that did not answer, PlatformUnreachable, and one that asked to slow down, PlatformRateLimited. Needs channel:read.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```csharp
await client.Lookups.RunAsync(
    new LookupInput
    {
        WorkspaceId = "workspaceId",
        ChannelId = "channelId",
        Name = "name",
    }
);
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

**request:** `LookupInput` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

