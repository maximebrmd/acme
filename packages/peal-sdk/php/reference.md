# Reference
## system
<details><summary><code>$client-&gt;system-&gt;health()</code></summary>
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

```php
$client->system->health();
```
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>$client-&gt;system-&gt;ready()</code></summary>
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

```php
$client->system->ready();
```
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>$client-&gt;system-&gt;changelog() -> ?ApiChangelog</code></summary>
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

```php
$client->system->changelog();
```
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## session
<details><summary><code>$client-&gt;session-&gt;me() -> ?Me</code></summary>
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

```php
$client->session->me();
```
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## apiKeys
<details><summary><code>$client-&gt;apiKeys-&gt;list($workspaceId) -> ?array</code></summary>
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

```php
$client->apiKeys->list(
    'workspaceId',
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

**$workspaceId:** `string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>$client-&gt;apiKeys-&gt;create($workspaceId, $request) -> ?CreatedApiKey</code></summary>
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

```php
$client->apiKeys->create(
    'workspaceId',
    new NewApiKey([
        'name' => 'name',
        'permissions' => [
            Permission::ActivityRead->value,
        ],
    ]),
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

**$workspaceId:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$expiresInDays:** `?int` 
    
</dd>
</dl>

<dl>
<dd>

**$name:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$permissions:** `array` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>$client-&gt;apiKeys-&gt;revoke($workspaceId, $apiKeyId)</code></summary>
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

```php
$client->apiKeys->revoke(
    'workspaceId',
    'apiKeyId',
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

**$workspaceId:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$apiKeyId:** `string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## channels
<details><summary><code>$client-&gt;channels-&gt;list($workspaceId) -> ?array</code></summary>
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

```php
$client->channels->list(
    'workspaceId',
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

**$workspaceId:** `string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>$client-&gt;channels-&gt;find($workspaceId, $request) -> ?ChannelPage</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Lists the workspace's channels a page at a time, oldest first: 50 unless `limit` (at most 100) says otherwise. Every filter given must hold: `platform`, `status` (`active`, `refreshNeeded` or `disabled`) and `q`, text the channel's handle, the name its platform shows or the name the workspace gave it holds, whatever its case. `counts` says how many channels the platform and text match in each status, whatever the status asked for. Pass the page's `nextCursor` as `cursor`, with the same filters, for the next page; a cursor no page gave is a bad request. Needs channel:read.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```php
$client->channels->find(
    'workspaceId',
    new FindChannelsRequest([]),
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

**$workspaceId:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$cursor:** `?string` 
    
</dd>
</dl>

<dl>
<dd>

**$limit:** `?string` 
    
</dd>
</dl>

<dl>
<dd>

**$platform:** `?string` 
    
</dd>
</dl>

<dl>
<dd>

**$q:** `?string` 
    
</dd>
</dl>

<dl>
<dd>

**$status:** `?string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>$client-&gt;channels-&gt;platforms($workspaceId) -> ?ConnectablePlatforms</code></summary>
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

```php
$client->channels->platforms(
    'workspaceId',
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

**$workspaceId:** `string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>$client-&gt;channels-&gt;connect($workspaceId, $platform, $request) -> ?Authorization</code></summary>
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

```php
$client->channels->connect(
    'workspaceId',
    Platform::X->value,
    new ConnectChannel([]),
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

**$workspaceId:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$platform:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$connection:** `?string` 
    
</dd>
</dl>

<dl>
<dd>

**$handle:** `?string` 
    
</dd>
</dl>

<dl>
<dd>

**$instance:** `?string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>$client-&gt;channels-&gt;completeConnect($workspaceId, $platform, $request) -> ?ConnectOutcome</code></summary>
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

```php
$client->channels->completeConnect(
    'workspaceId',
    Platform::X->value,
    new ConnectCallback([
        'state' => 'state',
    ]),
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

**$workspaceId:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$platform:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$code:** `?string` 
    
</dd>
</dl>

<dl>
<dd>

**$error:** `?string` 
    
</dd>
</dl>

<dl>
<dd>

**$iss:** `?string` 
    
</dd>
</dl>

<dl>
<dd>

**$state:** `string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>$client-&gt;channels-&gt;chooseAccounts($workspaceId, $platform, $request) -> ?array</code></summary>
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

```php
$client->channels->chooseAccounts(
    'workspaceId',
    Platform::X->value,
    new ChooseAccounts([
        'accountIds' => [
            'accountIds',
        ],
        'selection' => 'selection',
    ]),
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

**$workspaceId:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$platform:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$accountIds:** `array` 
    
</dd>
</dl>

<dl>
<dd>

**$selection:** `string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>$client-&gt;channels-&gt;reconnect($workspaceId, $channelId) -> ?Authorization</code></summary>
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

```php
$client->channels->reconnect(
    'workspaceId',
    'channelId',
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

**$workspaceId:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$channelId:** `string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>$client-&gt;channels-&gt;disconnect($workspaceId, $channelId)</code></summary>
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

```php
$client->channels->disconnect(
    'workspaceId',
    'channelId',
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

**$workspaceId:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$channelId:** `string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>$client-&gt;channels-&gt;update($workspaceId, $channelId, $request) -> ?Channel</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Gives the channel the name the workspace calls it by (`label`, 60 characters at most, on one line), or takes it back with null. The name is Peal's own: it is shown beside the handle and name the platform gives the account, which stay, and is sent to no platform. Needs channel:connect.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```php
$client->channels->update(
    'workspaceId',
    'channelId',
    new ChannelUpdate([
        'label' => null,
    ]),
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

**$workspaceId:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$channelId:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$label:** `?string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>$client-&gt;channels-&gt;disable($workspaceId, $channelId) -> ?Channel</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Turns the channel off: nothing goes out on it until it is turned back on. It keeps its connection, its history, its name and its place in the plan's count, and no reconnect reminder is sent meanwhile. A post that reaches its time while the channel is off fails on that channel (`channelDisabled`) and goes out on its others; it is not sent later. A channel already off stays as it is. Needs channel:connect.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```php
$client->channels->disable(
    'workspaceId',
    'channelId',
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

**$workspaceId:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$channelId:** `string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>$client-&gt;channels-&gt;enable($workspaceId, $channelId) -> ?Channel</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Turns a channel back on. It posts again at once, or has the status `refreshNeeded` when its token stopped working or ran out while it was off: reconnect the account then. A channel that is on stays as it is. Needs channel:connect.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```php
$client->channels->enable(
    'workspaceId',
    'channelId',
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

**$workspaceId:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$channelId:** `string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## posts
<details><summary><code>$client-&gt;posts-&gt;drafts($workspaceId, $request) -> ?DraftPage</code></summary>
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

```php
$client->posts->drafts(
    'workspaceId',
    new DraftsPostsRequest([]),
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

**$workspaceId:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$cursor:** `?string` 
    
</dd>
</dl>

<dl>
<dd>

**$limit:** `?string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>$client-&gt;posts-&gt;list($workspaceId, $request) -> ?array</code></summary>
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

```php
$client->posts->list(
    'workspaceId',
    new ListPostsRequest([
        'from' => 'from',
        'to' => 'to',
    ]),
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

**$workspaceId:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$from:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$to:** `string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>$client-&gt;posts-&gt;create($workspaceId, $request) -> ?Post</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Creates a draft for some of the workspace's channels, possibly none yet, with options on those whose platform takes them (`TargetOptions`, of the channel's platform). Its media must be the workspace's, and ready. Its text, media and options are checked against each platform's rules when it is scheduled, not before. It may name channel sets (`channelSets`, by id or name), whose connected channels it is for as well, with the options each set keeps; a channel of a set that is no longer connected is left out, and the answer says so (`warnings`). A channel on which it gives no options takes the channel's default options, if it has some. With `defaultSignatures`, each channel's default signature goes under its text, and `signatureId` puts one signature under it on every channel: a signature is then text of the post, never added under a text that already ends with it. Needs post:create, channel:read, and media:read when it shows media.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```php
$client->posts->create(
    'workspaceId',
    new CreatePostsRequest([
        'body' => new PostDraft([
            'channelIds' => [
                'channelIds',
            ],
            'content' => new PostContent([
                'media' => [
                    new MediaAttachment([
                        'altText' => 'altText',
                        'mediaId' => 'mediaId',
                    ]),
                ],
                'overrides' => [
                    new TextOverride([
                        'channelId' => 'channelId',
                        'text' => 'text',
                    ]),
                ],
                'text' => 'text',
            ]),
        ]),
    ]),
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

**$workspaceId:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$request:** `PostDraft` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>$client-&gt;posts-&gt;search($workspaceId, $request) -> ?PostPage</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Lists the workspace's posts, whatever their state, a page at a time: 20 unless `limit` (at most 100) says otherwise. Every filter given must hold: `status` (draft, scheduled, publishing, finished, cancelled), `outcome` (how a finished post ended, such as `failed` or `partiallyPublished`), `channelId` (posts with a target on that channel), `platform` (posts with a target on a connected channel of that platform), `tagId` (posts filed under that tag), `from` (included) and `to` (excluded), on the scheduled instant, which leave out posts without a time, `createdVia` (`web`, `apiKey` or `application`) and `authorId`. `sort` orders them by creation (`createdDesc`, the default, or `createdAsc`) or by scheduled instant (`scheduledDesc`, `scheduledAsc`, which list only posts with a time). Pass the page's `nextCursor` as `cursor`, with the same filters and sort, for the next page: a cursor marks where its page ended, so posts created, moved or deleted meanwhile make no page repeat or skip one; a cursor of another sort, or none a page gave, is a bad request. Each post comes whole, with its targets, their status, address and failure reason, and `channels` gives the platform of each channel the page names. Needs post:read and channel:read.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```php
$client->posts->search(
    'workspaceId',
    new SearchPostsRequest([]),
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

**$workspaceId:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$authorId:** `?string` 
    
</dd>
</dl>

<dl>
<dd>

**$channelId:** `?string` 
    
</dd>
</dl>

<dl>
<dd>

**$createdVia:** `?string` 
    
</dd>
</dl>

<dl>
<dd>

**$cursor:** `?string` 
    
</dd>
</dl>

<dl>
<dd>

**$from:** `?string` 
    
</dd>
</dl>

<dl>
<dd>

**$limit:** `?string` 
    
</dd>
</dl>

<dl>
<dd>

**$outcome:** `?string` 
    
</dd>
</dl>

<dl>
<dd>

**$platform:** `?string` 
    
</dd>
</dl>

<dl>
<dd>

**$sort:** `?string` 
    
</dd>
</dl>

<dl>
<dd>

**$status:** `?string` 
    
</dd>
</dl>

<dl>
<dd>

**$tagId:** `?string` 
    
</dd>
</dl>

<dl>
<dd>

**$to:** `?string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>$client-&gt;posts-&gt;send($workspaceId, $request) -> ?Post</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Creates a post and sends it to some of the workspace's channels in one call: `when` is `now`, which publishes at once, or `at` an instant, kept with its IANA time zone. Instead of listing channels, or beside them, it may name channel sets (`channelSets`, by id or name): it goes to their connected channels, with the options each set keeps where it gives none, and a channel of a set that is no longer connected is left out and told in the answer's `warnings`, never silently; a set none of whose channels is left, with no other channel, is refused (UnknownChannels). A channel on which it gives no options takes the channel's default options. `defaultSignatures` puts each channel's default signature under its text, and `signatureId` one signature on every channel: signatures are text of the post, counted against each platform's limit, and never added twice. It goes through every rule scheduling a draft does (each platform's limits on text, media and options, the account's own, the plan's), and answers every violation at once (PostContentInvalid): nothing is made then. In a workspace that asks for approvals, a post that needs one is answered with the status `awaitingApproval`: it keeps its time and goes out only once it is approved. What it publishes reaches the platforms' public, and cannot be taken back from Peal once it is out; until its time, cancel or unschedule it. Send an `Idempotency-Key` header (any text of your choosing, at most 255 characters, such as a UUID) to make a request safe to send again: within 24 hours, the same key with the same body answers the post the first request made, as it now stands, and makes no other; the same key with another body is refused (IdempotencyKeyReused), and answers PostNotFound once that post was deleted. Keys are kept per workspace, as digests. Apart from keys, a post whose content already goes to one of its channels less than 23 hours from its time is refused (DuplicatePost), as a request made twice by mistake would be, unless it says `allowDuplicate: true`; scheduling a draft is not checked. It answers as soon as the post is made, while it publishes, unless `wait` says to wait for the outcome: up to that many seconds (60 at most) for a post that goes out now, the answer is then the post once every channel has its result (`status` `finished`, with its `outcome`, each target `published` with its `permalink` or `failed` with its `failureReason`), or the post as it stands when the time runs out, some targets still `pending` or `publishing`: it goes on publishing, and `GET …/posts/{postId}/outcome` waits for the rest. The answer is 201 either way: the post was made. Needs post:schedule and channel:read, and media:read when it shows media; an OAuth client needs the scope workspace:publish.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```php
$client->posts->send(
    'workspaceId',
    new NewPost([
        'channelIds' => [
            'channelIds',
        ],
        'content' => new PostContent([
            'media' => [
                new MediaAttachment([
                    'altText' => 'altText',
                    'mediaId' => 'mediaId',
                ]),
            ],
            'overrides' => [
                new TextOverride([
                    'channelId' => 'channelId',
                    'text' => 'text',
                ]),
            ],
            'text' => 'text',
        ]),
        'when' => PostTiming::now(new PostTimingNow([])),
    ]),
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

**$workspaceId:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$wait:** `?string` 
    
</dd>
</dl>

<dl>
<dd>

**$idempotencyKey:** `?string` 
    
</dd>
</dl>

<dl>
<dd>

**$allowDuplicate:** `?bool` 
    
</dd>
</dl>

<dl>
<dd>

**$channelIds:** `array` 
    
</dd>
</dl>

<dl>
<dd>

**$channelSets:** `?array` 
    
</dd>
</dl>

<dl>
<dd>

**$content:** `PostContent` 
    
</dd>
</dl>

<dl>
<dd>

**$defaultSignatures:** `?bool` 
    
</dd>
</dl>

<dl>
<dd>

**$options:** `?array` 
    
</dd>
</dl>

<dl>
<dd>

**$signatureId:** `?string` 
    
</dd>
</dl>

<dl>
<dd>

**$tagIds:** `?array` 
    
</dd>
</dl>

<dl>
<dd>

**$when:** `PostTiming` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>$client-&gt;posts-&gt;bulk($workspaceId, $request) -> ?BulkResult</code></summary>
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

```php
$client->posts->bulk(
    'workspaceId',
    new BulkPosts([
        'posts' => [
            new BulkPost([
                'channelIds' => [
                    'channelIds',
                ],
                'content' => new PostContent([
                    'media' => [
                        new MediaAttachment([
                            'altText' => 'altText',
                            'mediaId' => 'mediaId',
                        ]),
                    ],
                    'overrides' => [
                        new TextOverride([
                            'channelId' => 'channelId',
                            'text' => 'text',
                        ]),
                    ],
                    'text' => 'text',
                ]),
                'when' => PostTiming::now(new PostTimingNow([])),
            ]),
        ],
    ]),
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

**$workspaceId:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$idempotencyKey:** `?string` 
    
</dd>
</dl>

<dl>
<dd>

**$posts:** `array` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>$client-&gt;posts-&gt;import($workspaceId, $request) -> ?ImportResult</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Creates and sends the posts a CSV file lists, one per row, at most 100 rows under its first line, which names the columns, in any order: `text` and `channels` (channel ids separated by spaces, commas or semicolons) are required columns, `at` too (`now`, an instant with its offset such as 2026-11-20T09:00:00Z, or a local time without one such as 2026-11-20 10:00, read in the row's `time_zone`, an IANA zone, UTC if left out); `media` (ids of ready media of the workspace), `allow_duplicate` (`true` or `false`) and `idempotency_key` are optional. Cells follow RFC 4180, strictly: a cell with a comma, a quote or a line break is written between double quotes, a quote inside it doubled; a quote anywhere else is ImportUnreadable (`strayQuote`). Blank lines are no rows. The file is checked first, every row, as `validate` checks a post and as the file it is (a row an earlier row leaves no room for in its month, one that repeats an earlier row's content near its time, and one that carries an earlier row's key with another post are refused; a row with more or fewer cells than the first line names is unreadable, never guessed); unless every row is valid, nothing is made, and `rows` says which are `valid`, `refused` (with what `send` would have answered) or `unreadable` (with the cells at fault). `dryRun` stops there even when every row is valid. Otherwise the rows are then made in order as `bulk` makes its items, each `created` or, when something changed since the check or a row repeats an earlier one, `refused`. The answer is 200 once the file was read; a file that cannot be read at all is ImportUnreadable. An `Idempotency-Key` header works as on `bulk`, by row. Needs post:schedule, post:read and channel:read, and media:read for rows with media; an OAuth client needs the scope workspace:publish.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```php
$client->posts->import(
    'workspaceId',
    new PostImport([
        'csv' => 'csv',
    ]),
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

**$workspaceId:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$idempotencyKey:** `?string` 
    
</dd>
</dl>

<dl>
<dd>

**$csv:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$dryRun:** `?bool` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>$client-&gt;posts-&gt;validate($workspaceId, $request) -> ?PostValidation</code></summary>
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

```php
$client->posts->validate(
    'workspaceId',
    new PostToValidate([
        'channelIds' => [
            'channelIds',
        ],
        'content' => new PostContent([
            'media' => [
                new MediaAttachment([
                    'altText' => 'altText',
                    'mediaId' => 'mediaId',
                ]),
            ],
            'overrides' => [
                new TextOverride([
                    'channelId' => 'channelId',
                    'text' => 'text',
                ]),
            ],
            'text' => 'text',
        ]),
    ]),
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

**$workspaceId:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$allowDuplicate:** `?bool` 
    
</dd>
</dl>

<dl>
<dd>

**$channelIds:** `array` 
    
</dd>
</dl>

<dl>
<dd>

**$channelSets:** `?array` 
    
</dd>
</dl>

<dl>
<dd>

**$content:** `PostContent` 
    
</dd>
</dl>

<dl>
<dd>

**$defaultSignatures:** `?bool` 
    
</dd>
</dl>

<dl>
<dd>

**$options:** `?array` 
    
</dd>
</dl>

<dl>
<dd>

**$signatureId:** `?string` 
    
</dd>
</dl>

<dl>
<dd>

**$when:** `?PostTiming` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>$client-&gt;posts-&gt;get($workspaceId, $postId) -> ?Post</code></summary>
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

```php
$client->posts->get(
    'workspaceId',
    'postId',
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

**$workspaceId:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$postId:** `string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>$client-&gt;posts-&gt;update($workspaceId, $postId, $request) -> ?Post</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Replaces a draft's content, channels and options: options left out are removed. Its tags are replaced by `tagIds` when given, and kept otherwise. A post that is no longer a draft is a conflict. Needs post:update, channel:read, and media:read when it shows media.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```php
$client->posts->update(
    'workspaceId',
    'postId',
    new UpdatePostsRequest([
        'body' => new PostDraft([
            'channelIds' => [
                'channelIds',
            ],
            'content' => new PostContent([
                'media' => [
                    new MediaAttachment([
                        'altText' => 'altText',
                        'mediaId' => 'mediaId',
                    ]),
                ],
                'overrides' => [
                    new TextOverride([
                        'channelId' => 'channelId',
                        'text' => 'text',
                    ]),
                ],
                'text' => 'text',
            ]),
        ]),
    ]),
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

**$workspaceId:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$postId:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$request:** `PostDraft` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>$client-&gt;posts-&gt;discard($workspaceId, $postId)</code></summary>
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

```php
$client->posts->discard(
    'workspaceId',
    'postId',
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

**$workspaceId:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$postId:** `string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>$client-&gt;posts-&gt;outcome($workspaceId, $postId, $request) -> ?Post</code></summary>
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

```php
$client->posts->outcome(
    'workspaceId',
    'postId',
    new OutcomePostsRequest([]),
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

**$workspaceId:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$postId:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$wait:** `?string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>$client-&gt;posts-&gt;attempts($workspaceId, $postId) -> ?array</code></summary>
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

```php
$client->posts->attempts(
    'workspaceId',
    'postId',
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

**$workspaceId:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$postId:** `string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>$client-&gt;posts-&gt;tag($workspaceId, $postId, $request) -> ?Post</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Files a post under these tags of the workspace, 10 at most, instead of those it had; an empty list takes them all off. Tags say nothing to the platforms, so a post takes them whatever its status, sent or not. Needs post:update.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```php
$client->posts->tag(
    'workspaceId',
    'postId',
    new PostTags([
        'tagIds' => [
            'tagIds',
        ],
    ]),
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

**$workspaceId:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$postId:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$tagIds:** `array` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>$client-&gt;posts-&gt;duplicate($workspaceId, $postId) -> ?Post</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Makes a new draft that says what the post says, whatever the post's status: its text, its media, its channels with their text and options, and its tags. What the workspace no longer has is left out rather than refused: a channel disconnected since, with the text the post had there, media deleted since, a tag deleted since. The copy has no time, and its author is whoever asked; the post itself is not changed. Needs post:read and post:create, and channel:read.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```php
$client->posts->duplicate(
    'workspaceId',
    'postId',
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

**$workspaceId:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$postId:** `string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>$client-&gt;posts-&gt;schedule($workspaceId, $postId, $request) -> ?Post</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Schedules a draft on some of the workspace's channels at an instant, kept with the IANA time zone it was chosen in. The content must fit each platform's rules, its media included: file types, sizes, durations, dimensions, alt text, how many videos, and whether images and videos go together. A channel whose platform takes options needs those it requires, as the draft gives them on that channel: a channel the draft was not for has none yet. A time up to a minute ago publishes now. On a server that bills, the posts going out in that month (UTC) must fit the workspace's plan (PlanLimitReached). Where the workspace asks for an approval of this post (its approval policy), the post is not scheduled: it answers with the status `awaitingApproval`, keeps its time, and goes out only once approved; contributors may then ask too, with post:create. Needs post:schedule and channel:read, and media:read when it shows media.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```php
$client->posts->schedule(
    'workspaceId',
    'postId',
    new SchedulePost([
        'at' => 'at',
        'channelIds' => [
            'channelIds',
        ],
        'timeZone' => 'timeZone',
    ]),
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

**$workspaceId:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$postId:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$at:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$channelIds:** `array` 
    
</dd>
</dl>

<dl>
<dd>

**$timeZone:** `string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>$client-&gt;posts-&gt;reschedule($workspaceId, $postId, $request) -> ?Post</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Moves a scheduled post, or one awaiting approval, to another instant, or schedules a draft on the channels it has. A post that needs an approval it does not have waits for it (`awaitingApproval`). Moved to another month, or scheduled, it must fit that month's posts in the workspace's plan (PlanLimitReached). Needs post:schedule, and channel:read for a draft.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```php
$client->posts->reschedule(
    'workspaceId',
    'postId',
    new ReschedulePostsRequest([
        'body' => new PostSchedule([
            'at' => 'at',
            'timeZone' => 'timeZone',
        ]),
    ]),
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

**$workspaceId:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$postId:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$request:** `PostSchedule` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>$client-&gt;posts-&gt;unschedule($workspaceId, $postId) -> ?Post</code></summary>
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

```php
$client->posts->unschedule(
    'workspaceId',
    'postId',
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

**$workspaceId:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$postId:** `string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>$client-&gt;posts-&gt;repost($workspaceId, $postId, $targetId) -> ?Post</code></summary>
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

```php
$client->posts->repost(
    'workspaceId',
    'postId',
    'targetId',
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

**$workspaceId:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$postId:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$targetId:** `string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>$client-&gt;posts-&gt;confirm($workspaceId, $postId, $targetId, $request) -> ?Post</code></summary>
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

```php
$client->posts->confirm(
    'workspaceId',
    'postId',
    'targetId',
    new ConfirmPostsRequest([
        'body' => TargetConfirmation::published(new TargetConfirmationPublished([
            'permalink' => null,
        ])),
    ]),
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

**$workspaceId:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$postId:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$targetId:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$request:** `TargetConfirmation` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>$client-&gt;posts-&gt;cancel($workspaceId, $postId) -> ?Post</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Cancels a draft, a scheduled post or one awaiting approval. A post already publishing finishes with what its channels did: those not yet sent are cancelled. Needs post:schedule.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```php
$client->posts->cancel(
    'workspaceId',
    'postId',
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

**$workspaceId:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$postId:** `string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## media
<details><summary><code>$client-&gt;media-&gt;list($workspaceId, $request) -> ?MediaPage</code></summary>
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

```php
$client->media->list(
    'workspaceId',
    new ListMediaRequest([]),
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

**$workspaceId:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$cursor:** `?string` 
    
</dd>
</dl>

<dl>
<dd>

**$limit:** `?string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>$client-&gt;media-&gt;create($workspaceId, $request) -> ?PreparedUpload</code></summary>
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

```php
$client->media->create(
    'workspaceId',
    new NewUpload([
        'byteSize' => 1000000,
        'contentType' => 'contentType',
    ]),
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

**$workspaceId:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$altText:** `?string` 
    
</dd>
</dl>

<dl>
<dd>

**$byteSize:** `int` 
    
</dd>
</dl>

<dl>
<dd>

**$contentType:** `string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>$client-&gt;media-&gt;importFromUrl($workspaceId, $request) -> ?Media</code></summary>
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

```php
$client->media->importFromUrl(
    'workspaceId',
    new MediaImport([
        'url' => 'url',
    ]),
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

**$workspaceId:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$altText:** `?string` 
    
</dd>
</dl>

<dl>
<dd>

**$url:** `string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>$client-&gt;media-&gt;get($workspaceId, $mediaId) -> ?Media</code></summary>
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

```php
$client->media->get(
    'workspaceId',
    'mediaId',
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

**$workspaceId:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$mediaId:** `string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>$client-&gt;media-&gt;delete($workspaceId, $mediaId)</code></summary>
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

```php
$client->media->delete(
    'workspaceId',
    'mediaId',
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

**$workspaceId:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$mediaId:** `string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>$client-&gt;media-&gt;describe($workspaceId, $mediaId, $request) -> ?Media</code></summary>
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

```php
$client->media->describe(
    'workspaceId',
    'mediaId',
    new MediaDescription([
        'altText' => null,
    ]),
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

**$workspaceId:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$mediaId:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$altText:** `?string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>$client-&gt;media-&gt;complete($workspaceId, $mediaId) -> ?Media</code></summary>
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

```php
$client->media->complete(
    'workspaceId',
    'mediaId',
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

**$workspaceId:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$mediaId:** `string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>$client-&gt;media-&gt;usage($workspaceId, $mediaId) -> ?MediaUsage</code></summary>
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

```php
$client->media->usage(
    'workspaceId',
    'mediaId',
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

**$workspaceId:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$mediaId:** `string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## notices
<details><summary><code>$client-&gt;notices-&gt;list($request) -> ?NoticePage</code></summary>
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

```php
$client->notices->list(
    new ListNoticesRequest([]),
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

**$cursor:** `?string` 
    
</dd>
</dl>

<dl>
<dd>

**$limit:** `?string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>$client-&gt;notices-&gt;unread() -> ?UnreadNotices</code></summary>
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

```php
$client->notices->unread();
```
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>$client-&gt;notices-&gt;markRead($request) -> ?UnreadNotices</code></summary>
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

```php
$client->notices->markRead(
    new MarkNoticesRead([
        'ids' => [
            'ids',
        ],
    ]),
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

**$ids:** `array` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>$client-&gt;notices-&gt;markAllRead() -> ?UnreadNotices</code></summary>
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

```php
$client->notices->markAllRead();
```
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## notificationPreferences
<details><summary><code>$client-&gt;notificationPreferences-&gt;get() -> ?NotificationPreferences</code></summary>
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

```php
$client->notificationPreferences->get();
```
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>$client-&gt;notificationPreferences-&gt;update($request) -> ?NotificationPreferences</code></summary>
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

```php
$client->notificationPreferences->update(
    new NotificationPreferencesChange([]),
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

**$email:** `?NotificationPreferencesChangeEmail` 
    
</dd>
</dl>

<dl>
<dd>

**$everyPost:** `?bool` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## assistant
<details><summary><code>$client-&gt;assistant-&gt;status($workspaceId) -> ?AssistantStatus</code></summary>
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

```php
$client->assistant->status(
    'workspaceId',
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

**$workspaceId:** `string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>$client-&gt;assistant-&gt;suggest($workspaceId, $request) -> ?Suggestion</code></summary>
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

```php
$client->assistant->suggest(
    'workspaceId',
    new SuggestionRequest([
        'action' => AssistantAction::rewrite(new AssistantActionRewrite([
            'tone' => AssistantTone::Professional->value,
        ])),
        'text' => 'text',
    ]),
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

**$workspaceId:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$action:** `AssistantAction` 
    
</dd>
</dl>

<dl>
<dd>

**$text:** `string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## members
<details><summary><code>$client-&gt;members-&gt;list($workspaceId) -> ?array</code></summary>
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

```php
$client->members->list(
    'workspaceId',
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

**$workspaceId:** `string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## invitations
<details><summary><code>$client-&gt;invitations-&gt;list($workspaceId) -> ?array</code></summary>
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

```php
$client->invitations->list(
    'workspaceId',
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

**$workspaceId:** `string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>$client-&gt;invitations-&gt;create($workspaceId, $request) -> ?Invitation</code></summary>
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

```php
$client->invitations->create(
    'workspaceId',
    new NewInvitation([
        'email' => 'email',
        'role' => Role::Owner->value,
    ]),
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

**$workspaceId:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$email:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$role:** `string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>$client-&gt;invitations-&gt;revoke($workspaceId, $invitationId)</code></summary>
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

```php
$client->invitations->revoke(
    'workspaceId',
    'invitationId',
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

**$workspaceId:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$invitationId:** `string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## billing
<details><summary><code>$client-&gt;billing-&gt;get($workspaceId) -> ?Billing</code></summary>
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

```php
$client->billing->get(
    'workspaceId',
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

**$workspaceId:** `string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>$client-&gt;billing-&gt;standing($workspaceId) -> ?Standing</code></summary>
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

```php
$client->billing->standing(
    'workspaceId',
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

**$workspaceId:** `string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## analytics
<details><summary><code>$client-&gt;analytics-&gt;summary($workspaceId, $request) -> ?AnalyticsSummary</code></summary>
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

```php
$client->analytics->summary(
    'workspaceId',
    new SummaryAnalyticsRequest([
        'from' => 'from',
        'timeZone' => 'timeZone',
        'to' => 'to',
    ]),
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

**$workspaceId:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$from:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$timeZone:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$to:** `string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>$client-&gt;analytics-&gt;post($workspaceId, $postId) -> ?PostAnalytics</code></summary>
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

```php
$client->analytics->post(
    'workspaceId',
    'postId',
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

**$workspaceId:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$postId:** `string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## tiktok
<details><summary><code>$client-&gt;tiktok-&gt;creator($workspaceId, $channelId) -> ?TikTokAccount</code></summary>
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

```php
$client->tiktok->creator(
    'workspaceId',
    'channelId',
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

**$workspaceId:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$channelId:** `string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## capabilities
<details><summary><code>$client-&gt;capabilities-&gt;platforms($workspaceId) -> ?array</code></summary>
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

```php
$client->capabilities->platforms(
    'workspaceId',
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

**$workspaceId:** `string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>$client-&gt;capabilities-&gt;channel($workspaceId, $channelId) -> ?ChannelCapabilities</code></summary>
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

```php
$client->capabilities->channel(
    'workspaceId',
    'channelId',
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

**$workspaceId:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$channelId:** `string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## lookups
<details><summary><code>$client-&gt;lookups-&gt;list($workspaceId, $channelId) -> ?array</code></summary>
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

```php
$client->lookups->list(
    'workspaceId',
    'channelId',
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

**$workspaceId:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$channelId:** `string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>$client-&gt;lookups-&gt;run($workspaceId, $channelId, $name, $request) -> ?LookupResult</code></summary>
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

```php
$client->lookups->run(
    'workspaceId',
    'channelId',
    'name',
    new LookupInput([]),
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

**$workspaceId:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$channelId:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$name:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$boardId:** `?string` 
    
</dd>
</dl>

<dl>
<dd>

**$cursor:** `?string` 
    
</dd>
</dl>

<dl>
<dd>

**$language:** `?string` 
    
</dd>
</dl>

<dl>
<dd>

**$limit:** `?int` 
    
</dd>
</dl>

<dl>
<dd>

**$regionCode:** `?string` 
    
</dd>
</dl>

<dl>
<dd>

**$vanityName:** `?string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## webhooks
<details><summary><code>$client-&gt;webhooks-&gt;list($workspaceId) -> ?array</code></summary>
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

```php
$client->webhooks->list(
    'workspaceId',
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

**$workspaceId:** `string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>$client-&gt;webhooks-&gt;create($workspaceId, $request) -> ?WebhookEndpointSecret</code></summary>
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

```php
$client->webhooks->create(
    'workspaceId',
    new NewWebhookEndpoint([
        'eventTypes' => [
            SubscribableWebhookEventType::PostScheduled->value,
        ],
        'url' => 'url',
    ]),
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

**$workspaceId:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$description:** `?string` 
    
</dd>
</dl>

<dl>
<dd>

**$enabled:** `?bool` 
    
</dd>
</dl>

<dl>
<dd>

**$eventTypes:** `array` 
    
</dd>
</dl>

<dl>
<dd>

**$scope:** `?string` 
    
</dd>
</dl>

<dl>
<dd>

**$url:** `string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>$client-&gt;webhooks-&gt;get($workspaceId, $endpointId) -> ?WebhookEndpoint</code></summary>
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

```php
$client->webhooks->get(
    'workspaceId',
    'endpointId',
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

**$workspaceId:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$endpointId:** `string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>$client-&gt;webhooks-&gt;delete($workspaceId, $endpointId)</code></summary>
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

```php
$client->webhooks->delete(
    'workspaceId',
    'endpointId',
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

**$workspaceId:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$endpointId:** `string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>$client-&gt;webhooks-&gt;update($workspaceId, $endpointId, $request) -> ?WebhookEndpoint</code></summary>
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

```php
$client->webhooks->update(
    'workspaceId',
    'endpointId',
    new WebhookEndpointChange([]),
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

**$workspaceId:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$endpointId:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$description:** `?string` 
    
</dd>
</dl>

<dl>
<dd>

**$enabled:** `?bool` 
    
</dd>
</dl>

<dl>
<dd>

**$eventTypes:** `?array` 
    
</dd>
</dl>

<dl>
<dd>

**$url:** `?string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>$client-&gt;webhooks-&gt;rotateSecret($workspaceId, $endpointId) -> ?WebhookEndpointSecret</code></summary>
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

```php
$client->webhooks->rotateSecret(
    'workspaceId',
    'endpointId',
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

**$workspaceId:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$endpointId:** `string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>$client-&gt;webhooks-&gt;sendTest($workspaceId, $endpointId) -> ?WebhookDelivery</code></summary>
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

```php
$client->webhooks->sendTest(
    'workspaceId',
    'endpointId',
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

**$workspaceId:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$endpointId:** `string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>$client-&gt;webhooks-&gt;listDeliveries($workspaceId, $endpointId, $request) -> ?WebhookDeliveryPage</code></summary>
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

```php
$client->webhooks->listDeliveries(
    'workspaceId',
    'endpointId',
    new ListDeliveriesWebhooksRequest([]),
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

**$workspaceId:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$endpointId:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$cursor:** `?string` 
    
</dd>
</dl>

<dl>
<dd>

**$limit:** `?string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>$client-&gt;webhooks-&gt;redeliver($workspaceId, $endpointId, $deliveryId) -> ?WebhookDelivery</code></summary>
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

```php
$client->webhooks->redeliver(
    'workspaceId',
    'endpointId',
    'deliveryId',
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

**$workspaceId:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$endpointId:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$deliveryId:** `string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## activity
<details><summary><code>$client-&gt;activity-&gt;list($workspaceId, $request) -> ?ActivityPage</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Lists the requests that asked to change something in the workspace, newest first, 30 a page unless `limit` (at most 100) says otherwise: who asked (a member or an API key), how they authenticated, the key or the application it came through, the operation, the ids its path named, the status answered and, when it was refused or failed, the error's code. What the web app's settings change through the sign-in service's routes (roles, members, invitations, the subscription) is kept as `auth:` and the route's path. Requests that only read are not kept, and neither is anything a request or its answer carried. `operation` keeps one operation (`posts.schedule`), `actor` what one member (a user id) or one API key (its id) asked for. Pass the page's `nextCursor` as `cursor` for the next one. An event is kept 90 days. Needs activity:read, which owners hold.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```php
$client->activity->list(
    'workspaceId',
    new ListActivityRequest([]),
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

**$workspaceId:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$actor:** `?string` 
    
</dd>
</dl>

<dl>
<dd>

**$cursor:** `?string` 
    
</dd>
</dl>

<dl>
<dd>

**$limit:** `?string` 
    
</dd>
</dl>

<dl>
<dd>

**$operation:** `?string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## partner
<details><summary><code>$client-&gt;partner-&gt;account() -> ?PartnerOverview</code></summary>
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

```php
$client->partner->account();
```
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>$client-&gt;partner-&gt;listWorkspaces($request) -> ?CustomerWorkspacePage</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Lists the workspaces the partner owns, newest first, each with the number of channels connected in it, 50 a page unless `limit` (at most 100) says otherwise. `externalId` finds the one workspace with that external id, exactly; `name` those whose name holds the text, whatever its case. `total` counts what the filters find; pass the page's `next` as `before` for the next page, as it is: it is a position in the list, which stays good when workspaces before it are offboarded, and anything else is refused (400). Needs the scope workspaces:read. Takes a partner key (`Authorization: Bearer peal_partner_…`): any other credential answers 403.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```php
$client->partner->listWorkspaces(
    new ListWorkspacesPartnerRequest([]),
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

**$before:** `?string` 
    
</dd>
</dl>

<dl>
<dd>

**$externalId:** `?string` 
    
</dd>
</dl>

<dl>
<dd>

**$limit:** `?string` 
    
</dd>
</dl>

<dl>
<dd>

**$name:** `?string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>$client-&gt;partner-&gt;createWorkspace($request) -> ?CustomerWorkspace</code></summary>
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

```php
$client->partner->createWorkspace(
    new NewCustomerWorkspace([
        'name' => 'name',
    ]),
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

**$idempotencyKey:** `?string` 
    
</dd>
</dl>

<dl>
<dd>

**$externalId:** `?string` 
    
</dd>
</dl>

<dl>
<dd>

**$name:** `string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>$client-&gt;partner-&gt;getWorkspace($workspaceId) -> ?CustomerWorkspace</code></summary>
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

```php
$client->partner->getWorkspace(
    'workspaceId',
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

**$workspaceId:** `string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>$client-&gt;partner-&gt;deleteWorkspace($workspaceId)</code></summary>
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

```php
$client->partner->deleteWorkspace(
    'workspaceId',
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

**$workspaceId:** `string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>$client-&gt;partner-&gt;updateWorkspace($workspaceId, $request) -> ?CustomerWorkspace</code></summary>
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

```php
$client->partner->updateWorkspace(
    'workspaceId',
    new CustomerWorkspaceChange([]),
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

**$workspaceId:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$externalId:** `?string` 
    
</dd>
</dl>

<dl>
<dd>

**$name:** `?string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## partnerAccount
<details><summary><code>$client-&gt;partnerAccount-&gt;get($workspaceId) -> ?PartnerStanding</code></summary>
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

```php
$client->partnerAccount->get(
    'workspaceId',
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

**$workspaceId:** `string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>$client-&gt;partnerAccount-&gt;open($workspaceId, $request) -> ?Partner</code></summary>
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

```php
$client->partnerAccount->open(
    'workspaceId',
    new OpenPartner([
        'name' => 'name',
    ]),
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

**$workspaceId:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$name:** `string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>$client-&gt;partnerAccount-&gt;close($workspaceId)</code></summary>
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

```php
$client->partnerAccount->close(
    'workspaceId',
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

**$workspaceId:** `string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>$client-&gt;partnerAccount-&gt;update($workspaceId, $request) -> ?Partner</code></summary>
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

```php
$client->partnerAccount->update(
    'workspaceId',
    new PartnerChange([]),
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

**$workspaceId:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$logoUrl:** `?string` 
    
</dd>
</dl>

<dl>
<dd>

**$name:** `?string` 
    
</dd>
</dl>

<dl>
<dd>

**$returnOrigins:** `?array` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>$client-&gt;partnerAccount-&gt;listKeys($workspaceId) -> ?array</code></summary>
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

```php
$client->partnerAccount->listKeys(
    'workspaceId',
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

**$workspaceId:** `string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>$client-&gt;partnerAccount-&gt;createKey($workspaceId, $request) -> ?CreatedPartnerKey</code></summary>
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

```php
$client->partnerAccount->createKey(
    'workspaceId',
    new NewPartnerKey([
        'name' => 'name',
        'permissions' => [
            Permission::ActivityRead->value,
        ],
        'scopes' => [
            PartnerScope::WorkspacesRead->value,
        ],
    ]),
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

**$workspaceId:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$expiresInDays:** `?int` 
    
</dd>
</dl>

<dl>
<dd>

**$name:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$permissions:** `array` 
    
</dd>
</dl>

<dl>
<dd>

**$scopes:** `array` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>$client-&gt;partnerAccount-&gt;revokeKey($workspaceId, $partnerKeyId)</code></summary>
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

```php
$client->partnerAccount->revokeKey(
    'workspaceId',
    'partnerKeyId',
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

**$workspaceId:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$partnerKeyId:** `string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>$client-&gt;partnerAccount-&gt;listWorkspaces($workspaceId, $request) -> ?CustomerWorkspacePage</code></summary>
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

```php
$client->partnerAccount->listWorkspaces(
    'workspaceId',
    new ListWorkspacesPartnerAccountRequest([]),
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

**$workspaceId:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$before:** `?string` 
    
</dd>
</dl>

<dl>
<dd>

**$externalId:** `?string` 
    
</dd>
</dl>

<dl>
<dd>

**$limit:** `?string` 
    
</dd>
</dl>

<dl>
<dd>

**$name:** `?string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## connectLinks
<details><summary><code>$client-&gt;connectLinks-&gt;list($workspaceId) -> ?array</code></summary>
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

```php
$client->connectLinks->list(
    'workspaceId',
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

**$workspaceId:** `string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>$client-&gt;connectLinks-&gt;create($workspaceId, $request) -> ?CreatedConnectLink</code></summary>
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

```php
$client->connectLinks->create(
    'workspaceId',
    new NewConnectLink([
        'platform' => Platform::X->value,
    ]),
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

**$workspaceId:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$channelId:** `?string` 
    
</dd>
</dl>

<dl>
<dd>

**$connection:** `?string` 
    
</dd>
</dl>

<dl>
<dd>

**$expiresInHours:** `?int` 
    
</dd>
</dl>

<dl>
<dd>

**$locale:** `?string` 
    
</dd>
</dl>

<dl>
<dd>

**$platform:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$returnUrl:** `?string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>$client-&gt;connectLinks-&gt;get($workspaceId, $linkId) -> ?ConnectLink</code></summary>
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

```php
$client->connectLinks->get(
    'workspaceId',
    'linkId',
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

**$workspaceId:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$linkId:** `string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>$client-&gt;connectLinks-&gt;revoke($workspaceId, $linkId) -> ?ConnectLink</code></summary>
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

```php
$client->connectLinks->revoke(
    'workspaceId',
    'linkId',
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

**$workspaceId:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$linkId:** `string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## review
<details><summary><code>$client-&gt;review-&gt;settings($workspaceId) -> ?ReviewSettings</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Answers with the workspace's approval policy: which of its posts wait for an approval before they are scheduled. Needs post:read.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```php
$client->review->settings(
    'workspaceId',
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

**$workspaceId:** `string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>$client-&gt;review-&gt;updateSettings($workspaceId, $request) -> ?ReviewSettings</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Chooses the workspace's approval policy. It applies to posts scheduled from then on: a post already scheduled stays scheduled, and one that waits still waits. Needs organization:update, and is refused to staff acting as a member.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```php
$client->review->updateSettings(
    'workspaceId',
    new UpdateSettingsReviewRequest([
        'body' => new ReviewSettings([
            'approvalPolicy' => ApprovalPolicy::Never->value,
        ]),
    ]),
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

**$workspaceId:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$request:** `ReviewSettings` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>$client-&gt;review-&gt;pending($workspaceId) -> ?array</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Lists the approvals that wait in the workspace, oldest first, 100 at most. Needs post:read.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```php
$client->review->pending(
    'workspaceId',
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

**$workspaceId:** `string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>$client-&gt;review-&gt;thread($workspaceId, $postId) -> ?PostReview</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Answers with a post's review: its comments, oldest first, and the approvals asked for it and what was decided, newest first. Needs post:read.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```php
$client->review->thread(
    'workspaceId',
    'postId',
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

**$workspaceId:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$postId:** `string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>$client-&gt;review-&gt;comment($workspaceId, $postId, $request) -> ?ReviewComment</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Comments on a post, starts a thread about one of its channels or some words of its text there, or answers a thread. The text is kept as plain text, 2000 characters at most, without control characters. Those who follow the post are told. Needs post:create or post:approve, and is refused to staff acting as a member.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```php
$client->review->comment(
    'workspaceId',
    'postId',
    new NewComment([
        'text' => 'text',
    ]),
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

**$workspaceId:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$postId:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$anchor:** `?NewCommentAnchor` 
    
</dd>
</dl>

<dl>
<dd>

**$parentId:** `?string` 
    
</dd>
</dl>

<dl>
<dd>

**$text:** `string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>$client-&gt;review-&gt;resolve($workspaceId, $postId, $commentId, $request) -> ?ReviewComment</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Resolves the thread a comment started, or reopens it. An answer is not resolved: its thread is (CommentInvalid, `parent`). Needs post:create or post:approve, and is refused to staff acting as a member.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```php
$client->review->resolve(
    'workspaceId',
    'postId',
    'commentId',
    new ResolveReviewRequest([
        'resolved' => true,
    ]),
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

**$workspaceId:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$postId:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$commentId:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$resolved:** `bool` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>$client-&gt;review-&gt;approve($workspaceId, $postId, $request) -> ?ApprovalOutcome</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Approves a post that waits for an approval, as the reviewer was shown it: send the `id` and the `subjectHash` of the approval that waits, as the post's review or the list of approvals gave them. When the post was asked again or says something else since, nothing is approved (ApprovalChanged): read it again. It is scheduled for the time it was asked for, and its job starts. Approved after that time (beyond a minute), nothing is published late: the post goes back to draft, still approved, and `late` is true; scheduling it again needs no new approval while it says the same. Recorded with who approved and when. In a workspace that holds more channels or members than its plan allows, which schedules nothing, nothing is approved (PlanLimitReached) and the post keeps waiting. Needs post:approve, and is refused to staff acting as a member.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```php
$client->review->approve(
    'workspaceId',
    'postId',
    new ApprovalDecision([
        'approvalId' => 'approvalId',
        'subjectHash' => 'subjectHash',
    ]),
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

**$workspaceId:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$postId:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$approvalId:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$subjectHash:** `string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>$client-&gt;review-&gt;requestChanges($workspaceId, $postId, $request) -> ?ChangesOutcome</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Sends a post that waits for an approval back to draft, with a comment that says what to change, and the `id` and `subjectHash` of the approval it refuses, as for approving. Its author and whoever asked are told. Needs post:approve, and is refused to staff acting as a member.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```php
$client->review->requestChanges(
    'workspaceId',
    'postId',
    new ChangesRequest([
        'approvalId' => 'approvalId',
        'subjectHash' => 'subjectHash',
        'comment' => 'comment',
    ]),
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

**$workspaceId:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$postId:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$approvalId:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$subjectHash:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$comment:** `string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>$client-&gt;review-&gt;links($workspaceId, $postId) -> ?array</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Lists a post's review links, newest first, ended ones included. No token is shown: a link's address is told once, when it is made. Needs post:read.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```php
$client->review->links(
    'workspaceId',
    'postId',
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

**$workspaceId:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$postId:** `string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>$client-&gt;review-&gt;createLink($workspaceId, $postId, $request) -> ?CreatedReviewLink</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Makes a link that shows a draft, a post that waits for an approval or a scheduled post to whoever holds it, without an account: the post as each channel will receive it, and nothing else of the workspace. It lets them view, comment, or approve, and works 14 days unless `expiresInHours` says otherwise (90 days at most), until it is revoked, or the post is published, cancelled or deleted. A post has 20 working links at most. The answer holds the link's address, which is not shown again. Needs post:approve, and is refused to staff acting as a member. A link that lets its holders approve is made in the web app only: an API key or an OAuth client is refused one, as it would approve its own posts with it.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```php
$client->review->createLink(
    'workspaceId',
    'postId',
    new NewReviewLink([
        'access' => ReviewLinkAccess::View->value,
    ]),
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

**$workspaceId:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$postId:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$access:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$expiresInHours:** `?int` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>$client-&gt;review-&gt;revokeLink($workspaceId, $linkId) -> ?ReviewLink</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Ends a review link at once: whoever opens it is told it was revoked. Needs post:approve, and is refused to staff acting as a member.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```php
$client->review->revokeLink(
    'workspaceId',
    'linkId',
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

**$workspaceId:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$linkId:** `string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## tags
<details><summary><code>$client-&gt;tags-&gt;list($workspaceId) -> ?array</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Lists the workspace's tags, oldest first. A post names its tags by id (`tagIds`). Needs post:read.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```php
$client->tags->list(
    'workspaceId',
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

**$workspaceId:** `string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>$client-&gt;tags-&gt;create($workspaceId, $request) -> ?Tag</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Adds a tag to the workspace: a name of 40 characters at most, on one line, which no other tag of the workspace has whatever its case, and a colour of the palette. A workspace keeps 100 tags at most. Needs post:update.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```php
$client->tags->create(
    'workspaceId',
    new CreateTagsRequest([
        'body' => new TagDetails([
            'colour' => TagColour::Gray->value,
            'name' => 'name',
        ]),
    ]),
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

**$workspaceId:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$request:** `TagDetails` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>$client-&gt;tags-&gt;delete($workspaceId, $tagId)</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Deletes a tag, and takes it off every post that had it; the posts stay. Needs post:update.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```php
$client->tags->delete(
    'workspaceId',
    'tagId',
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

**$workspaceId:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$tagId:** `string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>$client-&gt;tags-&gt;update($workspaceId, $tagId, $request) -> ?Tag</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Gives a tag another name or colour. Its posts keep it. Needs post:update.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```php
$client->tags->update(
    'workspaceId',
    'tagId',
    new UpdateTagsRequest([
        'body' => new TagDetails([
            'colour' => TagColour::Gray->value,
            'name' => 'name',
        ]),
    ]),
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

**$workspaceId:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$tagId:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$request:** `TagDetails` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## signatures
<details><summary><code>$client-&gt;signatures-&gt;list($workspaceId) -> ?array</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Lists the workspace's signatures, oldest first. Needs post:read.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```php
$client->signatures->list(
    'workspaceId',
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

**$workspaceId:** `string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>$client-&gt;signatures-&gt;create($workspaceId, $request) -> ?Signature</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Adds a signature to the workspace: a name no other signature of the workspace has whatever its case, a text of 2000 characters at most, and the `scope` it is meant for (the whole `workspace`, a `platform`, or one `channel` of the workspace). With `isDefault`, new posts that ask for the default signatures take it in its scope, and the signature that was the default of that scope is one no longer. A signature is text of the post once added: it counts against each platform's limit when the post is scheduled. A workspace keeps 50 signatures at most. Needs post:update, and channel:read for a channel's.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```php
$client->signatures->create(
    'workspaceId',
    new CreateSignaturesRequest([
        'body' => new SignatureDetails([
            'name' => 'name',
            'text' => 'text',
        ]),
    ]),
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

**$workspaceId:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$request:** `SignatureDetails` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>$client-&gt;signatures-&gt;update($workspaceId, $signatureId, $request) -> ?Signature</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Replaces a signature's name, text, scope and whether it is a default. Posts that already hold its text keep it as it was. Needs post:update, and channel:read for a channel's.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```php
$client->signatures->update(
    'workspaceId',
    'signatureId',
    new UpdateSignaturesRequest([
        'body' => new SignatureDetails([
            'name' => 'name',
            'text' => 'text',
        ]),
    ]),
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

**$workspaceId:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$signatureId:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$request:** `SignatureDetails` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>$client-&gt;signatures-&gt;delete($workspaceId, $signatureId)</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Deletes a signature. Posts that already hold its text keep it. Needs post:update.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```php
$client->signatures->delete(
    'workspaceId',
    'signatureId',
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

**$workspaceId:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$signatureId:** `string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## channelSets
<details><summary><code>$client-&gt;channelSets-&gt;list($workspaceId) -> ?array</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Lists the workspace's channel sets, oldest first, each with the channels it keeps and those of them disconnected since (`unavailableChannelIds`). Needs post:read and channel:read.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```php
$client->channelSets->list(
    'workspaceId',
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

**$workspaceId:** `string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>$client-&gt;channelSets-&gt;create($workspaceId, $request) -> ?ChannelSet</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Saves a selection of the workspace's channels under a name no other set of the workspace has whatever its case, 50 channels at most, with the options posts take on those whose platform has some (`TargetOptions`, of the channel's platform; unfinished options are kept, and checked when a post that takes them is scheduled). A post names a set by its id or its name (`channelSets`) instead of listing its channels. A workspace keeps 50 sets at most. Needs post:update and channel:read.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```php
$client->channelSets->create(
    'workspaceId',
    new CreateChannelSetsRequest([
        'body' => new ChannelSetDetails([
            'channelIds' => [
                'channelIds',
            ],
            'name' => 'name',
        ]),
    ]),
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

**$workspaceId:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$request:** `ChannelSetDetails` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>$client-&gt;channelSets-&gt;update($workspaceId, $channelSetId, $request) -> ?ChannelSet</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Replaces a set's name, channels and options: every channel must be connected now, so this is also how a disconnected one is taken out. Posts made with the set before keep their channels. Needs post:update and channel:read.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```php
$client->channelSets->update(
    'workspaceId',
    'channelSetId',
    new UpdateChannelSetsRequest([
        'body' => new ChannelSetDetails([
            'channelIds' => [
                'channelIds',
            ],
            'name' => 'name',
        ]),
    ]),
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

**$workspaceId:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$channelSetId:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$request:** `ChannelSetDetails` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>$client-&gt;channelSets-&gt;delete($workspaceId, $channelSetId)</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Deletes a channel set. Its channels, and the posts made with it, stay. Needs post:update.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```php
$client->channelSets->delete(
    'workspaceId',
    'channelSetId',
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

**$workspaceId:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$channelSetId:** `string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## channelDefaults
<details><summary><code>$client-&gt;channelDefaults-&gt;get($workspaceId, $channelId) -> ?ChannelDefaults</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Answers the options new posts take on the channel when they give none there, or null. Needs post:read and channel:read.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```php
$client->channelDefaults->get(
    'workspaceId',
    'channelId',
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

**$workspaceId:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$channelId:** `string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>$client-&gt;channelDefaults-&gt;set($workspaceId, $channelId, $request) -> ?ChannelDefaults</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Keeps these as the channel's default options, instead of any it had: options of the channel's own platform (`TargetOptions`), unfinished as a draft's may be. A new draft, and a post made in one call, takes them on the channel when it gives no options there and no channel set it names does; a draft that is updated keeps what it is given. Defaults are a starting point, never a way round the rules: a post that takes them is checked when it is scheduled as one that wrote them itself. Needs post:update and channel:read.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```php
$client->channelDefaults->set(
    'workspaceId',
    'channelId',
    new NewChannelDefaults([
        'options' => TargetOptions::youtube(new YouTubeOptions([])),
    ]),
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

**$workspaceId:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$channelId:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$options:** `TargetOptions` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>$client-&gt;channelDefaults-&gt;clear($workspaceId, $channelId)</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Leaves the channel without default options. Posts already made keep theirs. Needs post:update and channel:read.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```php
$client->channelDefaults->clear(
    'workspaceId',
    'channelId',
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

**$workspaceId:** `string` 
    
</dd>
</dl>

<dl>
<dd>

**$channelId:** `string` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

