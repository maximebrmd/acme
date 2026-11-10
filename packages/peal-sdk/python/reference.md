# Reference
## system
<details><summary><code>client.system.<a href="src/peal/system/client.py#L26-L49">health</a>()</code></summary>
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

```python
from peal import Peal
from peal.environment import PealEnvironment

client = Peal(
    token="<token>",
    environment=PealEnvironment.DEFAULT,
)

client.system.health()

```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**request_options:** `typing.Optional[RequestOptions]` — Request-specific configuration.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.system.<a href="src/peal/system/client.py#L51-L74">ready</a>()</code></summary>
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

```python
from peal import Peal
from peal.environment import PealEnvironment

client = Peal(
    token="<token>",
    environment=PealEnvironment.DEFAULT,
)

client.system.ready()

```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**request_options:** `typing.Optional[RequestOptions]` — Request-specific configuration.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.system.<a href="src/peal/system/client.py#L76-L100">changelog</a>() -> ApiChangelog</code></summary>
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

```python
from peal import Peal
from peal.environment import PealEnvironment

client = Peal(
    token="<token>",
    environment=PealEnvironment.DEFAULT,
)

client.system.changelog()

```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**request_options:** `typing.Optional[RequestOptions]` — Request-specific configuration.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## session
<details><summary><code>client.session.<a href="src/peal/session/client.py#L26-L50">me</a>() -> Me</code></summary>
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

```python
from peal import Peal
from peal.environment import PealEnvironment

client = Peal(
    token="<token>",
    environment=PealEnvironment.DEFAULT,
)

client.session.me()

```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**request_options:** `typing.Optional[RequestOptions]` — Request-specific configuration.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## apiKeys
<details><summary><code>client.api_keys.<a href="src/peal/api_keys/client.py#L31-L61">list</a>(...) -> typing.List[ApiKey]</code></summary>
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

```python
from peal import Peal
from peal.environment import PealEnvironment

client = Peal(
    token="<token>",
    environment=PealEnvironment.DEFAULT,
)

client.api_keys.list(
    workspace_id="workspaceId",
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

**workspace_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `typing.Optional[RequestOptions]` — Request-specific configuration.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.api_keys.<a href="src/peal/api_keys/client.py#L63-L113">create</a>(...) -> CreatedApiKey</code></summary>
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

```python
from peal import Peal
from peal.environment import PealEnvironment

client = Peal(
    token="<token>",
    environment=PealEnvironment.DEFAULT,
)

client.api_keys.create(
    workspace_id="workspaceId",
    name="name",
    permissions=[
        "activity:read"
    ],
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

**workspace_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**name:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**permissions:** `typing.List[Permission]` 
    
</dd>
</dl>

<dl>
<dd>

**expires_in_days:** `typing.Optional[int]` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `typing.Optional[RequestOptions]` — Request-specific configuration.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.api_keys.<a href="src/peal/api_keys/client.py#L115-L147">revoke</a>(...)</code></summary>
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

```python
from peal import Peal
from peal.environment import PealEnvironment

client = Peal(
    token="<token>",
    environment=PealEnvironment.DEFAULT,
)

client.api_keys.revoke(
    workspace_id="workspaceId",
    api_key_id="apiKeyId",
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

**workspace_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**api_key_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `typing.Optional[RequestOptions]` — Request-specific configuration.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## channels
<details><summary><code>client.channels.<a href="src/peal/channels/client.py#L34-L64">list</a>(...) -> typing.List[Channel]</code></summary>
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

```python
from peal import Peal
from peal.environment import PealEnvironment

client = Peal(
    token="<token>",
    environment=PealEnvironment.DEFAULT,
)

client.channels.list(
    workspace_id="workspaceId",
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

**workspace_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `typing.Optional[RequestOptions]` — Request-specific configuration.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.channels.<a href="src/peal/channels/client.py#L66-L96">platforms</a>(...) -> ConnectablePlatforms</code></summary>
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

```python
from peal import Peal
from peal.environment import PealEnvironment

client = Peal(
    token="<token>",
    environment=PealEnvironment.DEFAULT,
)

client.channels.platforms(
    workspace_id="workspaceId",
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

**workspace_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `typing.Optional[RequestOptions]` — Request-specific configuration.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.channels.<a href="src/peal/channels/client.py#L98-L151">connect</a>(...) -> Authorization</code></summary>
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

```python
from peal import Peal
from peal.environment import PealEnvironment

client = Peal(
    token="<token>",
    environment=PealEnvironment.DEFAULT,
)

client.channels.connect(
    workspace_id="workspaceId",
    platform="x",
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

**workspace_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**platform:** `Platform` 
    
</dd>
</dl>

<dl>
<dd>

**connection:** `typing.Optional[ChannelConnection]` 
    
</dd>
</dl>

<dl>
<dd>

**handle:** `typing.Optional[str]` 
    
</dd>
</dl>

<dl>
<dd>

**instance:** `typing.Optional[str]` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `typing.Optional[RequestOptions]` — Request-specific configuration.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.channels.<a href="src/peal/channels/client.py#L153-L205">complete_connect</a>(...) -> ConnectOutcome</code></summary>
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

```python
from peal import Peal
from peal.environment import PealEnvironment

client = Peal(
    token="<token>",
    environment=PealEnvironment.DEFAULT,
)

client.channels.complete_connect(
    workspace_id="workspaceId",
    platform="x",
    state="state",
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

**workspace_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**platform:** `Platform` 
    
</dd>
</dl>

<dl>
<dd>

**state:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**code:** `typing.Optional[str]` 
    
</dd>
</dl>

<dl>
<dd>

**error:** `typing.Optional[str]` 
    
</dd>
</dl>

<dl>
<dd>

**iss:** `typing.Optional[str]` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `typing.Optional[RequestOptions]` — Request-specific configuration.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.channels.<a href="src/peal/channels/client.py#L207-L254">choose_accounts</a>(...) -> typing.List[Channel]</code></summary>
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

```python
from peal import Peal
from peal.environment import PealEnvironment

client = Peal(
    token="<token>",
    environment=PealEnvironment.DEFAULT,
)

client.channels.choose_accounts(
    workspace_id="workspaceId",
    platform="x",
    account_ids=[
        "accountIds"
    ],
    selection="selection",
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

**workspace_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**platform:** `Platform` 
    
</dd>
</dl>

<dl>
<dd>

**account_ids:** `typing.List[str]` 
    
</dd>
</dl>

<dl>
<dd>

**selection:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `typing.Optional[RequestOptions]` — Request-specific configuration.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.channels.<a href="src/peal/channels/client.py#L256-L289">reconnect</a>(...) -> Authorization</code></summary>
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

```python
from peal import Peal
from peal.environment import PealEnvironment

client = Peal(
    token="<token>",
    environment=PealEnvironment.DEFAULT,
)

client.channels.reconnect(
    workspace_id="workspaceId",
    channel_id="channelId",
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

**workspace_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**channel_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `typing.Optional[RequestOptions]` — Request-specific configuration.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.channels.<a href="src/peal/channels/client.py#L291-L323">disconnect</a>(...)</code></summary>
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

```python
from peal import Peal
from peal.environment import PealEnvironment

client = Peal(
    token="<token>",
    environment=PealEnvironment.DEFAULT,
)

client.channels.disconnect(
    workspace_id="workspaceId",
    channel_id="channelId",
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

**workspace_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**channel_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `typing.Optional[RequestOptions]` — Request-specific configuration.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## posts
<details><summary><code>client.posts.<a href="src/peal/posts/client.py#L45-L84">drafts</a>(...) -> DraftPage</code></summary>
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

```python
from peal import Peal
from peal.environment import PealEnvironment

client = Peal(
    token="<token>",
    environment=PealEnvironment.DEFAULT,
)

client.posts.drafts(
    workspace_id="workspaceId",
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

**workspace_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**cursor:** `typing.Optional[str]` 
    
</dd>
</dl>

<dl>
<dd>

**limit:** `typing.Optional[str]` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `typing.Optional[RequestOptions]` — Request-specific configuration.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.posts.<a href="src/peal/posts/client.py#L86-L122">list</a>(...) -> typing.List[Post]</code></summary>
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

```python
from peal import Peal
from peal.environment import PealEnvironment

client = Peal(
    token="<token>",
    environment=PealEnvironment.DEFAULT,
)

client.posts.list(
    workspace_id="workspaceId",
    from_="from",
    to="to",
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

**workspace_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**from:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**to:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `typing.Optional[RequestOptions]` — Request-specific configuration.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.posts.<a href="src/peal/posts/client.py#L124-L184">create</a>(...) -> Post</code></summary>
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

```python
from peal import Peal, PostContent, MediaAttachment, TextOverride
from peal.environment import PealEnvironment

client = Peal(
    token="<token>",
    environment=PealEnvironment.DEFAULT,
)

client.posts.create(
    workspace_id="workspaceId",
    channel_ids=[
        "channelIds"
    ],
    content=PostContent(
        media=[
            MediaAttachment(
                alt_text="altText",
                media_id="mediaId",
            )
        ],
        overrides=[
            TextOverride(
                channel_id="channelId",
                text="text",
            )
        ],
        text="text",
    ),
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

**workspace_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**request:** `PostDraft` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `typing.Optional[RequestOptions]` — Request-specific configuration.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.posts.<a href="src/peal/posts/client.py#L186-L266">search</a>(...) -> PostPage</code></summary>
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

```python
from peal import Peal
from peal.environment import PealEnvironment

client = Peal(
    token="<token>",
    environment=PealEnvironment.DEFAULT,
)

client.posts.search(
    workspace_id="workspaceId",
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

**workspace_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**author_id:** `typing.Optional[str]` 
    
</dd>
</dl>

<dl>
<dd>

**channel_id:** `typing.Optional[str]` 
    
</dd>
</dl>

<dl>
<dd>

**created_via:** `typing.Optional[PostOriginVia]` 
    
</dd>
</dl>

<dl>
<dd>

**cursor:** `typing.Optional[str]` 
    
</dd>
</dl>

<dl>
<dd>

**from:** `typing.Optional[str]` 
    
</dd>
</dl>

<dl>
<dd>

**limit:** `typing.Optional[str]` 
    
</dd>
</dl>

<dl>
<dd>

**outcome:** `typing.Optional[PostOutcome]` 
    
</dd>
</dl>

<dl>
<dd>

**platform:** `typing.Optional[Platform]` 
    
</dd>
</dl>

<dl>
<dd>

**sort:** `typing.Optional[PostSort]` 
    
</dd>
</dl>

<dl>
<dd>

**status:** `typing.Optional[PostStatus]` 
    
</dd>
</dl>

<dl>
<dd>

**to:** `typing.Optional[str]` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `typing.Optional[RequestOptions]` — Request-specific configuration.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.posts.<a href="src/peal/posts/client.py#L268-L355">send</a>(...) -> Post</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Creates a post and sends it to some of the workspace's channels in one call: `when` is `now`, which publishes at once, or `at` an instant, kept with its IANA time zone. It goes through every rule scheduling a draft does (each platform's limits on text, media and options, the account's own, the plan's), and answers every violation at once (PostContentInvalid): nothing is made then. In a workspace that asks for approvals, a post that needs one is answered with the status `awaitingApproval`: it keeps its time and goes out only once it is approved. What it publishes reaches the platforms' public, and cannot be taken back from Peal once it is out; until its time, cancel or unschedule it. Send an `Idempotency-Key` header (any text of your choosing, at most 255 characters, such as a UUID) to make a request safe to send again: within 24 hours, the same key with the same body answers the post the first request made, as it now stands, and makes no other; the same key with another body is refused (IdempotencyKeyReused), and answers PostNotFound once that post was deleted. Keys are kept per workspace, as digests. Apart from keys, a post whose content already goes to one of its channels less than 23 hours from its time is refused (DuplicatePost), as a request made twice by mistake would be, unless it says `allowDuplicate: true`; scheduling a draft is not checked. It answers as soon as the post is made, while it publishes, unless `wait` says to wait for the outcome: up to that many seconds (60 at most) for a post that goes out now, the answer is then the post once every channel has its result (`status` `finished`, with its `outcome`, each target `published` with its `permalink` or `failed` with its `failureReason`), or the post as it stands when the time runs out, some targets still `pending` or `publishing`: it goes on publishing, and `GET …/posts/{postId}/outcome` waits for the rest. The answer is 201 either way: the post was made. Needs post:schedule and channel:read, and media:read when it shows media; an OAuth client needs the scope workspace:publish.
</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```python
from peal import Peal, PostContent, MediaAttachment, TextOverride, PostTiming_Now
from peal.environment import PealEnvironment

client = Peal(
    token="<token>",
    environment=PealEnvironment.DEFAULT,
)

client.posts.send(
    workspace_id="workspaceId",
    channel_ids=[
        "channelIds"
    ],
    content=PostContent(
        media=[
            MediaAttachment(
                alt_text="altText",
                media_id="mediaId",
            )
        ],
        overrides=[
            TextOverride(
                channel_id="channelId",
                text="text",
            )
        ],
        text="text",
    ),
    when=PostTiming_Now(),
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

**workspace_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**channel_ids:** `typing.List[str]` 
    
</dd>
</dl>

<dl>
<dd>

**content:** `PostContent` 
    
</dd>
</dl>

<dl>
<dd>

**when:** `PostTiming` 
    
</dd>
</dl>

<dl>
<dd>

**wait:** `typing.Optional[str]` 
    
</dd>
</dl>

<dl>
<dd>

**idempotency_key:** `typing.Optional[str]` 
    
</dd>
</dl>

<dl>
<dd>

**allow_duplicate:** `typing.Optional[bool]` 
    
</dd>
</dl>

<dl>
<dd>

**options:** `typing.Optional[typing.List[ChannelOptions]]` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `typing.Optional[RequestOptions]` — Request-specific configuration.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.posts.<a href="src/peal/posts/client.py#L357-L426">bulk</a>(...) -> BulkResult</code></summary>
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

```python
from peal import Peal, BulkPost, PostContent, MediaAttachment, TextOverride, PostTiming_Now
from peal.environment import PealEnvironment

client = Peal(
    token="<token>",
    environment=PealEnvironment.DEFAULT,
)

client.posts.bulk(
    workspace_id="workspaceId",
    posts=[
        BulkPost(
            channel_ids=[
                "channelIds"
            ],
            content=PostContent(
                media=[
                    MediaAttachment(
                        alt_text="altText",
                        media_id="mediaId",
                    )
                ],
                overrides=[
                    TextOverride(
                        channel_id="channelId",
                        text="text",
                    )
                ],
                text="text",
            ),
            when=PostTiming_Now(),
        )
    ],
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

**workspace_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**posts:** `typing.List[BulkPost]` 
    
</dd>
</dl>

<dl>
<dd>

**idempotency_key:** `typing.Optional[str]` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `typing.Optional[RequestOptions]` — Request-specific configuration.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.posts.<a href="src/peal/posts/client.py">import</a>(...) -> ImportResult</code></summary>
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

```python
from peal import Peal
from peal.environment import PealEnvironment

client = Peal(
    token="<token>",
    environment=PealEnvironment.DEFAULT,
)

client.posts.import_(
    workspace_id="workspaceId",
    csv="csv",
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

**workspace_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**csv:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**idempotency_key:** `typing.Optional[str]` 
    
</dd>
</dl>

<dl>
<dd>

**dry_run:** `typing.Optional[bool]` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `typing.Optional[RequestOptions]` — Request-specific configuration.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.posts.<a href="src/peal/posts/client.py#L475-L547">validate</a>(...) -> PostValidation</code></summary>
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

```python
from peal import Peal, PostContent, MediaAttachment, TextOverride
from peal.environment import PealEnvironment

client = Peal(
    token="<token>",
    environment=PealEnvironment.DEFAULT,
)

client.posts.validate(
    workspace_id="workspaceId",
    channel_ids=[
        "channelIds"
    ],
    content=PostContent(
        media=[
            MediaAttachment(
                alt_text="altText",
                media_id="mediaId",
            )
        ],
        overrides=[
            TextOverride(
                channel_id="channelId",
                text="text",
            )
        ],
        text="text",
    ),
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

**workspace_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**channel_ids:** `typing.List[str]` 
    
</dd>
</dl>

<dl>
<dd>

**content:** `PostContent` 
    
</dd>
</dl>

<dl>
<dd>

**allow_duplicate:** `typing.Optional[bool]` 
    
</dd>
</dl>

<dl>
<dd>

**options:** `typing.Optional[typing.List[ChannelOptions]]` 
    
</dd>
</dl>

<dl>
<dd>

**when:** `typing.Optional[PostTiming]` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `typing.Optional[RequestOptions]` — Request-specific configuration.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.posts.<a href="src/peal/posts/client.py#L549-L580">get</a>(...) -> Post</code></summary>
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

```python
from peal import Peal
from peal.environment import PealEnvironment

client = Peal(
    token="<token>",
    environment=PealEnvironment.DEFAULT,
)

client.posts.get(
    workspace_id="workspaceId",
    post_id="postId",
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

**workspace_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**post_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `typing.Optional[RequestOptions]` — Request-specific configuration.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.posts.<a href="src/peal/posts/client.py#L582-L651">update</a>(...) -> Post</code></summary>
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

```python
from peal import Peal, PostContent, MediaAttachment, TextOverride
from peal.environment import PealEnvironment

client = Peal(
    token="<token>",
    environment=PealEnvironment.DEFAULT,
)

client.posts.update(
    workspace_id="workspaceId",
    post_id="postId",
    channel_ids=[
        "channelIds"
    ],
    content=PostContent(
        media=[
            MediaAttachment(
                alt_text="altText",
                media_id="mediaId",
            )
        ],
        overrides=[
            TextOverride(
                channel_id="channelId",
                text="text",
            )
        ],
        text="text",
    ),
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

**workspace_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**post_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**request:** `PostDraft` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `typing.Optional[RequestOptions]` — Request-specific configuration.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.posts.<a href="src/peal/posts/client.py#L653-L685">discard</a>(...)</code></summary>
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

```python
from peal import Peal
from peal.environment import PealEnvironment

client = Peal(
    token="<token>",
    environment=PealEnvironment.DEFAULT,
)

client.posts.discard(
    workspace_id="workspaceId",
    post_id="postId",
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

**workspace_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**post_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `typing.Optional[RequestOptions]` — Request-specific configuration.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.posts.<a href="src/peal/posts/client.py#L687-L727">outcome</a>(...) -> Post</code></summary>
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

```python
from peal import Peal
from peal.environment import PealEnvironment

client = Peal(
    token="<token>",
    environment=PealEnvironment.DEFAULT,
)

client.posts.outcome(
    workspace_id="workspaceId",
    post_id="postId",
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

**workspace_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**post_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**wait:** `typing.Optional[str]` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `typing.Optional[RequestOptions]` — Request-specific configuration.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.posts.<a href="src/peal/posts/client.py#L729-L762">attempts</a>(...) -> typing.List[PublicationAttempt]</code></summary>
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

```python
from peal import Peal
from peal.environment import PealEnvironment

client = Peal(
    token="<token>",
    environment=PealEnvironment.DEFAULT,
)

client.posts.attempts(
    workspace_id="workspaceId",
    post_id="postId",
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

**workspace_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**post_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `typing.Optional[RequestOptions]` — Request-specific configuration.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.posts.<a href="src/peal/posts/client.py#L764-L815">schedule</a>(...) -> Post</code></summary>
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

```python
from peal import Peal
from peal.environment import PealEnvironment

client = Peal(
    token="<token>",
    environment=PealEnvironment.DEFAULT,
)

client.posts.schedule(
    workspace_id="workspaceId",
    post_id="postId",
    at="at",
    channel_ids=[
        "channelIds"
    ],
    time_zone="timeZone",
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

**workspace_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**post_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**at:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**channel_ids:** `typing.List[str]` 
    
</dd>
</dl>

<dl>
<dd>

**time_zone:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `typing.Optional[RequestOptions]` — Request-specific configuration.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.posts.<a href="src/peal/posts/client.py#L817-L864">reschedule</a>(...) -> Post</code></summary>
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

```python
from peal import Peal
from peal.environment import PealEnvironment

client = Peal(
    token="<token>",
    environment=PealEnvironment.DEFAULT,
)

client.posts.reschedule(
    workspace_id="workspaceId",
    post_id="postId",
    at="at",
    time_zone="timeZone",
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

**workspace_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**post_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**request:** `PostSchedule` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `typing.Optional[RequestOptions]` — Request-specific configuration.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.posts.<a href="src/peal/posts/client.py#L866-L899">unschedule</a>(...) -> Post</code></summary>
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

```python
from peal import Peal
from peal.environment import PealEnvironment

client = Peal(
    token="<token>",
    environment=PealEnvironment.DEFAULT,
)

client.posts.unschedule(
    workspace_id="workspaceId",
    post_id="postId",
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

**workspace_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**post_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `typing.Optional[RequestOptions]` — Request-specific configuration.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.posts.<a href="src/peal/posts/client.py#L901-L942">repost</a>(...) -> Post</code></summary>
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

```python
from peal import Peal
from peal.environment import PealEnvironment

client = Peal(
    token="<token>",
    environment=PealEnvironment.DEFAULT,
)

client.posts.repost(
    workspace_id="workspaceId",
    post_id="postId",
    target_id="targetId",
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

**workspace_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**post_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**target_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `typing.Optional[RequestOptions]` — Request-specific configuration.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.posts.<a href="src/peal/posts/client.py#L944-L991">confirm</a>(...) -> Post</code></summary>
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

```python
from peal import Peal, TargetConfirmation_Published
from peal.environment import PealEnvironment

client = Peal(
    token="<token>",
    environment=PealEnvironment.DEFAULT,
)

client.posts.confirm(
    workspace_id="workspaceId",
    post_id="postId",
    target_id="targetId",
    request=TargetConfirmation_Published(
        permalink=None,
    ),
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

**workspace_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**post_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**target_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**request:** `TargetConfirmation` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `typing.Optional[RequestOptions]` — Request-specific configuration.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.posts.<a href="src/peal/posts/client.py#L993-L1026">cancel</a>(...) -> Post</code></summary>
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

```python
from peal import Peal
from peal.environment import PealEnvironment

client = Peal(
    token="<token>",
    environment=PealEnvironment.DEFAULT,
)

client.posts.cancel(
    workspace_id="workspaceId",
    post_id="postId",
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

**workspace_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**post_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `typing.Optional[RequestOptions]` — Request-specific configuration.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## media
<details><summary><code>client.media.<a href="src/peal/media/client.py#L32-L71">list</a>(...) -> MediaPage</code></summary>
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

```python
from peal import Peal
from peal.environment import PealEnvironment

client = Peal(
    token="<token>",
    environment=PealEnvironment.DEFAULT,
)

client.media.list(
    workspace_id="workspaceId",
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

**workspace_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**cursor:** `typing.Optional[str]` 
    
</dd>
</dl>

<dl>
<dd>

**limit:** `typing.Optional[str]` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `typing.Optional[RequestOptions]` — Request-specific configuration.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.media.<a href="src/peal/media/client.py#L73-L123">create</a>(...) -> PreparedUpload</code></summary>
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

```python
from peal import Peal
from peal.environment import PealEnvironment

client = Peal(
    token="<token>",
    environment=PealEnvironment.DEFAULT,
)

client.media.create(
    workspace_id="workspaceId",
    byte_size=1000000,
    content_type="contentType",
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

**workspace_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**byte_size:** `int` 
    
</dd>
</dl>

<dl>
<dd>

**content_type:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**alt_text:** `typing.Optional[str]` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `typing.Optional[RequestOptions]` — Request-specific configuration.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.media.<a href="src/peal/media/client.py#L125-L167">import_from_url</a>(...) -> Media</code></summary>
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

```python
from peal import Peal
from peal.environment import PealEnvironment

client = Peal(
    token="<token>",
    environment=PealEnvironment.DEFAULT,
)

client.media.import_from_url(
    workspace_id="workspaceId",
    url="url",
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

**workspace_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**url:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**alt_text:** `typing.Optional[str]` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `typing.Optional[RequestOptions]` — Request-specific configuration.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.media.<a href="src/peal/media/client.py#L169-L202">get</a>(...) -> Media</code></summary>
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

```python
from peal import Peal
from peal.environment import PealEnvironment

client = Peal(
    token="<token>",
    environment=PealEnvironment.DEFAULT,
)

client.media.get(
    workspace_id="workspaceId",
    media_id="mediaId",
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

**workspace_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**media_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `typing.Optional[RequestOptions]` — Request-specific configuration.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.media.<a href="src/peal/media/client.py#L204-L236">delete</a>(...)</code></summary>
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

```python
from peal import Peal
from peal.environment import PealEnvironment

client = Peal(
    token="<token>",
    environment=PealEnvironment.DEFAULT,
)

client.media.delete(
    workspace_id="workspaceId",
    media_id="mediaId",
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

**workspace_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**media_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `typing.Optional[RequestOptions]` — Request-specific configuration.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.media.<a href="src/peal/media/client.py#L238-L280">describe</a>(...) -> Media</code></summary>
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

```python
from peal import Peal
from peal.environment import PealEnvironment

client = Peal(
    token="<token>",
    environment=PealEnvironment.DEFAULT,
)

client.media.describe(
    workspace_id="workspaceId",
    media_id="mediaId",
    alt_text=None,
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

**workspace_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**media_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**alt_text:** `typing.Optional[str]` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `typing.Optional[RequestOptions]` — Request-specific configuration.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.media.<a href="src/peal/media/client.py#L282-L315">complete</a>(...) -> Media</code></summary>
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

```python
from peal import Peal
from peal.environment import PealEnvironment

client = Peal(
    token="<token>",
    environment=PealEnvironment.DEFAULT,
)

client.media.complete(
    workspace_id="workspaceId",
    media_id="mediaId",
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

**workspace_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**media_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `typing.Optional[RequestOptions]` — Request-specific configuration.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.media.<a href="src/peal/media/client.py#L317-L350">usage</a>(...) -> MediaUsage</code></summary>
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

```python
from peal import Peal
from peal.environment import PealEnvironment

client = Peal(
    token="<token>",
    environment=PealEnvironment.DEFAULT,
)

client.media.usage(
    workspace_id="workspaceId",
    media_id="mediaId",
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

**workspace_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**media_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `typing.Optional[RequestOptions]` — Request-specific configuration.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## notices
<details><summary><code>client.notices.<a href="src/peal/notices/client.py#L30-L64">list</a>(...) -> NoticePage</code></summary>
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

```python
from peal import Peal
from peal.environment import PealEnvironment

client = Peal(
    token="<token>",
    environment=PealEnvironment.DEFAULT,
)

client.notices.list()

```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**cursor:** `typing.Optional[str]` 
    
</dd>
</dl>

<dl>
<dd>

**limit:** `typing.Optional[str]` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `typing.Optional[RequestOptions]` — Request-specific configuration.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.notices.<a href="src/peal/notices/client.py#L66-L90">unread</a>() -> UnreadNotices</code></summary>
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

```python
from peal import Peal
from peal.environment import PealEnvironment

client = Peal(
    token="<token>",
    environment=PealEnvironment.DEFAULT,
)

client.notices.unread()

```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**request_options:** `typing.Optional[RequestOptions]` — Request-specific configuration.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.notices.<a href="src/peal/notices/client.py#L92-L122">mark_read</a>(...) -> UnreadNotices</code></summary>
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

```python
from peal import Peal
from peal.environment import PealEnvironment

client = Peal(
    token="<token>",
    environment=PealEnvironment.DEFAULT,
)

client.notices.mark_read(
    ids=[
        "ids"
    ],
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

**ids:** `typing.List[str]` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `typing.Optional[RequestOptions]` — Request-specific configuration.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.notices.<a href="src/peal/notices/client.py#L124-L148">mark_all_read</a>() -> UnreadNotices</code></summary>
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

```python
from peal import Peal
from peal.environment import PealEnvironment

client = Peal(
    token="<token>",
    environment=PealEnvironment.DEFAULT,
)

client.notices.mark_all_read()

```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**request_options:** `typing.Optional[RequestOptions]` — Request-specific configuration.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## notificationPreferences
<details><summary><code>client.notification_preferences.<a href="src/peal/notification_preferences/client.py#L30-L54">get</a>() -> NotificationPreferences</code></summary>
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

```python
from peal import Peal
from peal.environment import PealEnvironment

client = Peal(
    token="<token>",
    environment=PealEnvironment.DEFAULT,
)

client.notification_preferences.get()

```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**request_options:** `typing.Optional[RequestOptions]` — Request-specific configuration.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.notification_preferences.<a href="src/peal/notification_preferences/client.py#L56-L90">update</a>(...) -> NotificationPreferences</code></summary>
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

```python
from peal import Peal
from peal.environment import PealEnvironment

client = Peal(
    token="<token>",
    environment=PealEnvironment.DEFAULT,
)

client.notification_preferences.update()

```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**email:** `typing.Optional[NotificationPreferencesChangeEmail]` 
    
</dd>
</dl>

<dl>
<dd>

**every_post:** `typing.Optional[bool]` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `typing.Optional[RequestOptions]` — Request-specific configuration.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## assistant
<details><summary><code>client.assistant.<a href="src/peal/assistant/client.py#L31-L59">status</a>(...) -> AssistantStatus</code></summary>
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

```python
from peal import Peal
from peal.environment import PealEnvironment

client = Peal(
    token="<token>",
    environment=PealEnvironment.DEFAULT,
)

client.assistant.status(
    workspace_id="workspaceId",
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

**workspace_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `typing.Optional[RequestOptions]` — Request-specific configuration.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.assistant.<a href="src/peal/assistant/client.py#L61-L104">suggest</a>(...) -> Suggestion</code></summary>
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

```python
from peal import Peal, AssistantAction_Rewrite
from peal.environment import PealEnvironment

client = Peal(
    token="<token>",
    environment=PealEnvironment.DEFAULT,
)

client.assistant.suggest(
    workspace_id="workspaceId",
    action=AssistantAction_Rewrite(
        tone="professional",
    ),
    text="text",
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

**workspace_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**action:** `AssistantAction` 
    
</dd>
</dl>

<dl>
<dd>

**text:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `typing.Optional[RequestOptions]` — Request-specific configuration.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## members
<details><summary><code>client.members.<a href="src/peal/members/client.py#L26-L56">list</a>(...) -> typing.List[WorkspaceMember]</code></summary>
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

```python
from peal import Peal
from peal.environment import PealEnvironment

client = Peal(
    token="<token>",
    environment=PealEnvironment.DEFAULT,
)

client.members.list(
    workspace_id="workspaceId",
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

**workspace_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `typing.Optional[RequestOptions]` — Request-specific configuration.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## invitations
<details><summary><code>client.invitations.<a href="src/peal/invitations/client.py#L30-L60">list</a>(...) -> typing.List[Invitation]</code></summary>
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

```python
from peal import Peal
from peal.environment import PealEnvironment

client = Peal(
    token="<token>",
    environment=PealEnvironment.DEFAULT,
)

client.invitations.list(
    workspace_id="workspaceId",
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

**workspace_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `typing.Optional[RequestOptions]` — Request-specific configuration.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.invitations.<a href="src/peal/invitations/client.py#L62-L98">create</a>(...) -> Invitation</code></summary>
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

```python
from peal import Peal
from peal.environment import PealEnvironment

client = Peal(
    token="<token>",
    environment=PealEnvironment.DEFAULT,
)

client.invitations.create(
    workspace_id="workspaceId",
    email="email",
    role="owner",
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

**workspace_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**email:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**role:** `Role` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `typing.Optional[RequestOptions]` — Request-specific configuration.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.invitations.<a href="src/peal/invitations/client.py#L100-L132">revoke</a>(...)</code></summary>
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

```python
from peal import Peal
from peal.environment import PealEnvironment

client = Peal(
    token="<token>",
    environment=PealEnvironment.DEFAULT,
)

client.invitations.revoke(
    workspace_id="workspaceId",
    invitation_id="invitationId",
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

**workspace_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**invitation_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `typing.Optional[RequestOptions]` — Request-specific configuration.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## billing
<details><summary><code>client.billing.<a href="src/peal/billing/client.py#L27-L55">get</a>(...) -> Billing</code></summary>
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

```python
from peal import Peal
from peal.environment import PealEnvironment

client = Peal(
    token="<token>",
    environment=PealEnvironment.DEFAULT,
)

client.billing.get(
    workspace_id="workspaceId",
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

**workspace_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `typing.Optional[RequestOptions]` — Request-specific configuration.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.billing.<a href="src/peal/billing/client.py#L57-L85">standing</a>(...) -> Standing</code></summary>
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

```python
from peal import Peal
from peal.environment import PealEnvironment

client = Peal(
    token="<token>",
    environment=PealEnvironment.DEFAULT,
)

client.billing.standing(
    workspace_id="workspaceId",
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

**workspace_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `typing.Optional[RequestOptions]` — Request-specific configuration.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## analytics
<details><summary><code>client.analytics.<a href="src/peal/analytics/client.py#L28-L75">summary</a>(...) -> AnalyticsSummary</code></summary>
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

```python
from peal import Peal
from peal.environment import PealEnvironment

client = Peal(
    token="<token>",
    environment=PealEnvironment.DEFAULT,
)

client.analytics.summary(
    workspace_id="workspaceId",
    from_="from",
    time_zone="timeZone",
    to="to",
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

**workspace_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**from:** `CalendarDay` 
    
</dd>
</dl>

<dl>
<dd>

**time_zone:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**to:** `CalendarDay` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `typing.Optional[RequestOptions]` — Request-specific configuration.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.analytics.<a href="src/peal/analytics/client.py#L77-L110">post</a>(...) -> PostAnalytics</code></summary>
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

```python
from peal import Peal
from peal.environment import PealEnvironment

client = Peal(
    token="<token>",
    environment=PealEnvironment.DEFAULT,
)

client.analytics.post(
    workspace_id="workspaceId",
    post_id="postId",
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

**workspace_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**post_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `typing.Optional[RequestOptions]` — Request-specific configuration.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## tiktok
<details><summary><code>client.tiktok.<a href="src/peal/tiktok/client.py#L26-L59">creator</a>(...) -> TikTokAccount</code></summary>
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

```python
from peal import Peal
from peal.environment import PealEnvironment

client = Peal(
    token="<token>",
    environment=PealEnvironment.DEFAULT,
)

client.tiktok.creator(
    workspace_id="workspaceId",
    channel_id="channelId",
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

**workspace_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**channel_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `typing.Optional[RequestOptions]` — Request-specific configuration.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## capabilities
<details><summary><code>client.capabilities.<a href="src/peal/capabilities/client.py#L27-L57">platforms</a>(...) -> typing.List[PlatformCapabilities]</code></summary>
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

```python
from peal import Peal
from peal.environment import PealEnvironment

client = Peal(
    token="<token>",
    environment=PealEnvironment.DEFAULT,
)

client.capabilities.platforms(
    workspace_id="workspaceId",
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

**workspace_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `typing.Optional[RequestOptions]` — Request-specific configuration.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.capabilities.<a href="src/peal/capabilities/client.py#L59-L92">channel</a>(...) -> ChannelCapabilities</code></summary>
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

```python
from peal import Peal
from peal.environment import PealEnvironment

client = Peal(
    token="<token>",
    environment=PealEnvironment.DEFAULT,
)

client.capabilities.channel(
    workspace_id="workspaceId",
    channel_id="channelId",
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

**workspace_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**channel_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `typing.Optional[RequestOptions]` — Request-specific configuration.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## lookups
<details><summary><code>client.lookups.<a href="src/peal/lookups/client.py#L30-L63">list</a>(...) -> typing.List[LookupDescription]</code></summary>
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

```python
from peal import Peal
from peal.environment import PealEnvironment

client = Peal(
    token="<token>",
    environment=PealEnvironment.DEFAULT,
)

client.lookups.list(
    workspace_id="workspaceId",
    channel_id="channelId",
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

**workspace_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**channel_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `typing.Optional[RequestOptions]` — Request-specific configuration.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.lookups.<a href="src/peal/lookups/client.py#L65-L135">run</a>(...) -> LookupResult</code></summary>
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

```python
from peal import Peal
from peal.environment import PealEnvironment

client = Peal(
    token="<token>",
    environment=PealEnvironment.DEFAULT,
)

client.lookups.run(
    workspace_id="workspaceId",
    channel_id="channelId",
    name="name",
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

**workspace_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**channel_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**name:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**board_id:** `typing.Optional[str]` 
    
</dd>
</dl>

<dl>
<dd>

**cursor:** `typing.Optional[str]` 
    
</dd>
</dl>

<dl>
<dd>

**language:** `typing.Optional[str]` 
    
</dd>
</dl>

<dl>
<dd>

**limit:** `typing.Optional[int]` 
    
</dd>
</dl>

<dl>
<dd>

**region_code:** `typing.Optional[str]` 
    
</dd>
</dl>

<dl>
<dd>

**vanity_name:** `typing.Optional[str]` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `typing.Optional[RequestOptions]` — Request-specific configuration.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## webhooks
<details><summary><code>client.webhooks.<a href="src/peal/webhooks/client.py#L34-L64">list</a>(...) -> typing.List[WebhookEndpoint]</code></summary>
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

```python
from peal import Peal
from peal.environment import PealEnvironment

client = Peal(
    token="<token>",
    environment=PealEnvironment.DEFAULT,
)

client.webhooks.list(
    workspace_id="workspaceId",
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

**workspace_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `typing.Optional[RequestOptions]` — Request-specific configuration.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.webhooks.<a href="src/peal/webhooks/client.py#L66-L124">create</a>(...) -> WebhookEndpointSecret</code></summary>
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

```python
from peal import Peal
from peal.environment import PealEnvironment

client = Peal(
    token="<token>",
    environment=PealEnvironment.DEFAULT,
)

client.webhooks.create(
    workspace_id="workspaceId",
    event_types=[
        "post.scheduled"
    ],
    url="url",
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

**workspace_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**event_types:** `typing.List[SubscribableWebhookEventType]` 
    
</dd>
</dl>

<dl>
<dd>

**url:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**description:** `typing.Optional[str]` 
    
</dd>
</dl>

<dl>
<dd>

**enabled:** `typing.Optional[bool]` 
    
</dd>
</dl>

<dl>
<dd>

**scope:** `typing.Optional[WebhookEndpointScope]` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `typing.Optional[RequestOptions]` — Request-specific configuration.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.webhooks.<a href="src/peal/webhooks/client.py#L126-L159">get</a>(...) -> WebhookEndpoint</code></summary>
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

```python
from peal import Peal
from peal.environment import PealEnvironment

client = Peal(
    token="<token>",
    environment=PealEnvironment.DEFAULT,
)

client.webhooks.get(
    workspace_id="workspaceId",
    endpoint_id="endpointId",
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

**workspace_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**endpoint_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `typing.Optional[RequestOptions]` — Request-specific configuration.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.webhooks.<a href="src/peal/webhooks/client.py#L161-L193">delete</a>(...)</code></summary>
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

```python
from peal import Peal
from peal.environment import PealEnvironment

client = Peal(
    token="<token>",
    environment=PealEnvironment.DEFAULT,
)

client.webhooks.delete(
    workspace_id="workspaceId",
    endpoint_id="endpointId",
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

**workspace_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**endpoint_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `typing.Optional[RequestOptions]` — Request-specific configuration.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.webhooks.<a href="src/peal/webhooks/client.py#L195-L252">update</a>(...) -> WebhookEndpoint</code></summary>
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

```python
from peal import Peal
from peal.environment import PealEnvironment

client = Peal(
    token="<token>",
    environment=PealEnvironment.DEFAULT,
)

client.webhooks.update(
    workspace_id="workspaceId",
    endpoint_id="endpointId",
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

**workspace_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**endpoint_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**description:** `typing.Optional[str]` 
    
</dd>
</dl>

<dl>
<dd>

**enabled:** `typing.Optional[bool]` 
    
</dd>
</dl>

<dl>
<dd>

**event_types:** `typing.Optional[typing.List[SubscribableWebhookEventType]]` 
    
</dd>
</dl>

<dl>
<dd>

**url:** `typing.Optional[str]` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `typing.Optional[RequestOptions]` — Request-specific configuration.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.webhooks.<a href="src/peal/webhooks/client.py#L254-L287">rotate_secret</a>(...) -> WebhookEndpointSecret</code></summary>
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

```python
from peal import Peal
from peal.environment import PealEnvironment

client = Peal(
    token="<token>",
    environment=PealEnvironment.DEFAULT,
)

client.webhooks.rotate_secret(
    workspace_id="workspaceId",
    endpoint_id="endpointId",
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

**workspace_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**endpoint_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `typing.Optional[RequestOptions]` — Request-specific configuration.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.webhooks.<a href="src/peal/webhooks/client.py#L289-L322">send_test</a>(...) -> WebhookDelivery</code></summary>
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

```python
from peal import Peal
from peal.environment import PealEnvironment

client = Peal(
    token="<token>",
    environment=PealEnvironment.DEFAULT,
)

client.webhooks.send_test(
    workspace_id="workspaceId",
    endpoint_id="endpointId",
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

**workspace_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**endpoint_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `typing.Optional[RequestOptions]` — Request-specific configuration.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.webhooks.<a href="src/peal/webhooks/client.py#L324-L369">list_deliveries</a>(...) -> WebhookDeliveryPage</code></summary>
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

```python
from peal import Peal
from peal.environment import PealEnvironment

client = Peal(
    token="<token>",
    environment=PealEnvironment.DEFAULT,
)

client.webhooks.list_deliveries(
    workspace_id="workspaceId",
    endpoint_id="endpointId",
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

**workspace_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**endpoint_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**cursor:** `typing.Optional[str]` 
    
</dd>
</dl>

<dl>
<dd>

**limit:** `typing.Optional[str]` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `typing.Optional[RequestOptions]` — Request-specific configuration.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.webhooks.<a href="src/peal/webhooks/client.py#L371-L412">redeliver</a>(...) -> WebhookDelivery</code></summary>
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

```python
from peal import Peal
from peal.environment import PealEnvironment

client = Peal(
    token="<token>",
    environment=PealEnvironment.DEFAULT,
)

client.webhooks.redeliver(
    workspace_id="workspaceId",
    endpoint_id="endpointId",
    delivery_id="deliveryId",
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

**workspace_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**endpoint_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**delivery_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `typing.Optional[RequestOptions]` — Request-specific configuration.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## activity
<details><summary><code>client.activity.<a href="src/peal/activity/client.py#L26-L73">list</a>(...) -> ActivityPage</code></summary>
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

```python
from peal import Peal
from peal.environment import PealEnvironment

client = Peal(
    token="<token>",
    environment=PealEnvironment.DEFAULT,
)

client.activity.list(
    workspace_id="workspaceId",
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

**workspace_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**actor:** `typing.Optional[str]` 
    
</dd>
</dl>

<dl>
<dd>

**cursor:** `typing.Optional[str]` 
    
</dd>
</dl>

<dl>
<dd>

**limit:** `typing.Optional[str]` 
    
</dd>
</dl>

<dl>
<dd>

**operation:** `typing.Optional[str]` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `typing.Optional[RequestOptions]` — Request-specific configuration.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## partner
<details><summary><code>client.partner.<a href="src/peal/partner/client.py#L31-L55">account</a>() -> PartnerOverview</code></summary>
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

```python
from peal import Peal
from peal.environment import PealEnvironment

client = Peal(
    token="<token>",
    environment=PealEnvironment.DEFAULT,
)

client.partner.account()

```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**request_options:** `typing.Optional[RequestOptions]` — Request-specific configuration.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.partner.<a href="src/peal/partner/client.py#L57-L99">list_workspaces</a>(...) -> CustomerWorkspacePage</code></summary>
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

```python
from peal import Peal
from peal.environment import PealEnvironment

client = Peal(
    token="<token>",
    environment=PealEnvironment.DEFAULT,
)

client.partner.list_workspaces()

```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**before:** `typing.Optional[str]` 
    
</dd>
</dl>

<dl>
<dd>

**external_id:** `typing.Optional[str]` 
    
</dd>
</dl>

<dl>
<dd>

**limit:** `typing.Optional[str]` 
    
</dd>
</dl>

<dl>
<dd>

**name:** `typing.Optional[str]` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `typing.Optional[RequestOptions]` — Request-specific configuration.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.partner.<a href="src/peal/partner/client.py#L101-L142">create_workspace</a>(...) -> CustomerWorkspace</code></summary>
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

```python
from peal import Peal
from peal.environment import PealEnvironment

client = Peal(
    token="<token>",
    environment=PealEnvironment.DEFAULT,
)

client.partner.create_workspace(
    name="name",
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

**name:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**idempotency_key:** `typing.Optional[str]` 
    
</dd>
</dl>

<dl>
<dd>

**external_id:** `typing.Optional[str]` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `typing.Optional[RequestOptions]` — Request-specific configuration.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.partner.<a href="src/peal/partner/client.py#L144-L174">get_workspace</a>(...) -> CustomerWorkspace</code></summary>
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

```python
from peal import Peal
from peal.environment import PealEnvironment

client = Peal(
    token="<token>",
    environment=PealEnvironment.DEFAULT,
)

client.partner.get_workspace(
    workspace_id="workspaceId",
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

**workspace_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `typing.Optional[RequestOptions]` — Request-specific configuration.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.partner.<a href="src/peal/partner/client.py#L176-L203">delete_workspace</a>(...)</code></summary>
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

```python
from peal import Peal
from peal.environment import PealEnvironment

client = Peal(
    token="<token>",
    environment=PealEnvironment.DEFAULT,
)

client.partner.delete_workspace(
    workspace_id="workspaceId",
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

**workspace_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `typing.Optional[RequestOptions]` — Request-specific configuration.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.partner.<a href="src/peal/partner/client.py#L205-L246">update_workspace</a>(...) -> CustomerWorkspace</code></summary>
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

```python
from peal import Peal
from peal.environment import PealEnvironment

client = Peal(
    token="<token>",
    environment=PealEnvironment.DEFAULT,
)

client.partner.update_workspace(
    workspace_id="workspaceId",
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

**workspace_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**external_id:** `typing.Optional[str]` 
    
</dd>
</dl>

<dl>
<dd>

**name:** `typing.Optional[str]` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `typing.Optional[RequestOptions]` — Request-specific configuration.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## partnerAccount
<details><summary><code>client.partner_account.<a href="src/peal/partner_account/client.py#L35-L63">get</a>(...) -> PartnerStanding</code></summary>
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

```python
from peal import Peal
from peal.environment import PealEnvironment

client = Peal(
    token="<token>",
    environment=PealEnvironment.DEFAULT,
)

client.partner_account.get(
    workspace_id="workspaceId",
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

**workspace_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `typing.Optional[RequestOptions]` — Request-specific configuration.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.partner_account.<a href="src/peal/partner_account/client.py#L65-L96">open</a>(...) -> Partner</code></summary>
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

```python
from peal import Peal
from peal.environment import PealEnvironment

client = Peal(
    token="<token>",
    environment=PealEnvironment.DEFAULT,
)

client.partner_account.open(
    workspace_id="workspaceId",
    name="name",
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

**workspace_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**name:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `typing.Optional[RequestOptions]` — Request-specific configuration.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.partner_account.<a href="src/peal/partner_account/client.py#L98-L125">close</a>(...)</code></summary>
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

```python
from peal import Peal
from peal.environment import PealEnvironment

client = Peal(
    token="<token>",
    environment=PealEnvironment.DEFAULT,
)

client.partner_account.close(
    workspace_id="workspaceId",
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

**workspace_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `typing.Optional[RequestOptions]` — Request-specific configuration.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.partner_account.<a href="src/peal/partner_account/client.py#L127-L171">update</a>(...) -> Partner</code></summary>
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

```python
from peal import Peal
from peal.environment import PealEnvironment

client = Peal(
    token="<token>",
    environment=PealEnvironment.DEFAULT,
)

client.partner_account.update(
    workspace_id="workspaceId",
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

**workspace_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**logo_url:** `typing.Optional[str]` 
    
</dd>
</dl>

<dl>
<dd>

**name:** `typing.Optional[str]` 
    
</dd>
</dl>

<dl>
<dd>

**return_origins:** `typing.Optional[typing.List[str]]` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `typing.Optional[RequestOptions]` — Request-specific configuration.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.partner_account.<a href="src/peal/partner_account/client.py#L173-L203">list_keys</a>(...) -> typing.List[PartnerKey]</code></summary>
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

```python
from peal import Peal
from peal.environment import PealEnvironment

client = Peal(
    token="<token>",
    environment=PealEnvironment.DEFAULT,
)

client.partner_account.list_keys(
    workspace_id="workspaceId",
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

**workspace_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `typing.Optional[RequestOptions]` — Request-specific configuration.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.partner_account.<a href="src/peal/partner_account/client.py#L205-L260">create_key</a>(...) -> CreatedPartnerKey</code></summary>
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

```python
from peal import Peal
from peal.environment import PealEnvironment

client = Peal(
    token="<token>",
    environment=PealEnvironment.DEFAULT,
)

client.partner_account.create_key(
    workspace_id="workspaceId",
    name="name",
    permissions=[
        "activity:read"
    ],
    scopes=[
        "workspaces:read"
    ],
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

**workspace_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**name:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**permissions:** `typing.List[Permission]` 
    
</dd>
</dl>

<dl>
<dd>

**scopes:** `typing.List[PartnerScope]` 
    
</dd>
</dl>

<dl>
<dd>

**expires_in_days:** `typing.Optional[int]` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `typing.Optional[RequestOptions]` — Request-specific configuration.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.partner_account.<a href="src/peal/partner_account/client.py#L262-L294">revoke_key</a>(...)</code></summary>
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

```python
from peal import Peal
from peal.environment import PealEnvironment

client = Peal(
    token="<token>",
    environment=PealEnvironment.DEFAULT,
)

client.partner_account.revoke_key(
    workspace_id="workspaceId",
    partner_key_id="partnerKeyId",
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

**workspace_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**partner_key_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `typing.Optional[RequestOptions]` — Request-specific configuration.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.partner_account.<a href="src/peal/partner_account/client.py#L296-L348">list_workspaces</a>(...) -> CustomerWorkspacePage</code></summary>
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

```python
from peal import Peal
from peal.environment import PealEnvironment

client = Peal(
    token="<token>",
    environment=PealEnvironment.DEFAULT,
)

client.partner_account.list_workspaces(
    workspace_id="workspaceId",
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

**workspace_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**before:** `typing.Optional[str]` 
    
</dd>
</dl>

<dl>
<dd>

**external_id:** `typing.Optional[str]` 
    
</dd>
</dl>

<dl>
<dd>

**limit:** `typing.Optional[str]` 
    
</dd>
</dl>

<dl>
<dd>

**name:** `typing.Optional[str]` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `typing.Optional[RequestOptions]` — Request-specific configuration.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## connectLinks
<details><summary><code>client.connect_links.<a href="src/peal/connect_links/client.py#L33-L63">list</a>(...) -> typing.List[ConnectLink]</code></summary>
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

```python
from peal import Peal
from peal.environment import PealEnvironment

client = Peal(
    token="<token>",
    environment=PealEnvironment.DEFAULT,
)

client.connect_links.list(
    workspace_id="workspaceId",
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

**workspace_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `typing.Optional[RequestOptions]` — Request-specific configuration.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.connect_links.<a href="src/peal/connect_links/client.py#L65-L126">create</a>(...) -> CreatedConnectLink</code></summary>
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

```python
from peal import Peal
from peal.environment import PealEnvironment

client = Peal(
    token="<token>",
    environment=PealEnvironment.DEFAULT,
)

client.connect_links.create(
    workspace_id="workspaceId",
    platform="x",
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

**workspace_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**platform:** `Platform` 
    
</dd>
</dl>

<dl>
<dd>

**channel_id:** `typing.Optional[str]` 
    
</dd>
</dl>

<dl>
<dd>

**connection:** `typing.Optional[ChannelConnection]` 
    
</dd>
</dl>

<dl>
<dd>

**expires_in_hours:** `typing.Optional[int]` 
    
</dd>
</dl>

<dl>
<dd>

**locale:** `typing.Optional[ConnectLinkLocale]` 
    
</dd>
</dl>

<dl>
<dd>

**return_url:** `typing.Optional[str]` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `typing.Optional[RequestOptions]` — Request-specific configuration.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.connect_links.<a href="src/peal/connect_links/client.py#L128-L161">get</a>(...) -> ConnectLink</code></summary>
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

```python
from peal import Peal
from peal.environment import PealEnvironment

client = Peal(
    token="<token>",
    environment=PealEnvironment.DEFAULT,
)

client.connect_links.get(
    workspace_id="workspaceId",
    link_id="linkId",
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

**workspace_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**link_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `typing.Optional[RequestOptions]` — Request-specific configuration.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.connect_links.<a href="src/peal/connect_links/client.py#L163-L196">revoke</a>(...) -> ConnectLink</code></summary>
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

```python
from peal import Peal
from peal.environment import PealEnvironment

client = Peal(
    token="<token>",
    environment=PealEnvironment.DEFAULT,
)

client.connect_links.revoke(
    workspace_id="workspaceId",
    link_id="linkId",
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

**workspace_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**link_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `typing.Optional[RequestOptions]` — Request-specific configuration.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

## review
<details><summary><code>client.review.<a href="src/peal/review/client.py#L39-L67">settings</a>(...) -> ReviewSettings</code></summary>
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

```python
from peal import Peal
from peal.environment import PealEnvironment

client = Peal(
    token="<token>",
    environment=PealEnvironment.DEFAULT,
)

client.review.settings(
    workspace_id="workspaceId",
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

**workspace_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `typing.Optional[RequestOptions]` — Request-specific configuration.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.review.<a href="src/peal/review/client.py#L69-L108">update_settings</a>(...) -> ReviewSettings</code></summary>
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

```python
from peal import Peal
from peal.environment import PealEnvironment

client = Peal(
    token="<token>",
    environment=PealEnvironment.DEFAULT,
)

client.review.update_settings(
    workspace_id="workspaceId",
    approval_policy="never",
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

**workspace_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**request:** `ReviewSettings` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `typing.Optional[RequestOptions]` — Request-specific configuration.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.review.<a href="src/peal/review/client.py#L110-L140">pending</a>(...) -> typing.List[ApprovalRequest]</code></summary>
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

```python
from peal import Peal
from peal.environment import PealEnvironment

client = Peal(
    token="<token>",
    environment=PealEnvironment.DEFAULT,
)

client.review.pending(
    workspace_id="workspaceId",
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

**workspace_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `typing.Optional[RequestOptions]` — Request-specific configuration.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.review.<a href="src/peal/review/client.py#L142-L175">thread</a>(...) -> PostReview</code></summary>
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

```python
from peal import Peal
from peal.environment import PealEnvironment

client = Peal(
    token="<token>",
    environment=PealEnvironment.DEFAULT,
)

client.review.thread(
    workspace_id="workspaceId",
    post_id="postId",
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

**workspace_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**post_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `typing.Optional[RequestOptions]` — Request-specific configuration.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.review.<a href="src/peal/review/client.py#L177-L226">comment</a>(...) -> ReviewComment</code></summary>
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

```python
from peal import Peal
from peal.environment import PealEnvironment

client = Peal(
    token="<token>",
    environment=PealEnvironment.DEFAULT,
)

client.review.comment(
    workspace_id="workspaceId",
    post_id="postId",
    text="text",
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

**workspace_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**post_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**text:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**anchor:** `typing.Optional[NewCommentAnchor]` 
    
</dd>
</dl>

<dl>
<dd>

**parent_id:** `typing.Optional[str]` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `typing.Optional[RequestOptions]` — Request-specific configuration.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.review.<a href="src/peal/review/client.py#L228-L275">resolve</a>(...) -> ReviewComment</code></summary>
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

```python
from peal import Peal
from peal.environment import PealEnvironment

client = Peal(
    token="<token>",
    environment=PealEnvironment.DEFAULT,
)

client.review.resolve(
    workspace_id="workspaceId",
    post_id="postId",
    comment_id="commentId",
    resolved=True,
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

**workspace_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**post_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**comment_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**resolved:** `bool` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `typing.Optional[RequestOptions]` — Request-specific configuration.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.review.<a href="src/peal/review/client.py#L277-L324">approve</a>(...) -> ApprovalOutcome</code></summary>
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

```python
from peal import Peal
from peal.environment import PealEnvironment

client = Peal(
    token="<token>",
    environment=PealEnvironment.DEFAULT,
)

client.review.approve(
    workspace_id="workspaceId",
    post_id="postId",
    approval_id="approvalId",
    subject_hash="subjectHash",
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

**workspace_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**post_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**approval_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**subject_hash:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `typing.Optional[RequestOptions]` — Request-specific configuration.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.review.<a href="src/peal/review/client.py#L326-L382">request_changes</a>(...) -> ChangesOutcome</code></summary>
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

```python
from peal import Peal
from peal.environment import PealEnvironment

client = Peal(
    token="<token>",
    environment=PealEnvironment.DEFAULT,
)

client.review.request_changes(
    workspace_id="workspaceId",
    post_id="postId",
    approval_id="approvalId",
    subject_hash="subjectHash",
    comment="comment",
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

**workspace_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**post_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**approval_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**subject_hash:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**comment:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `typing.Optional[RequestOptions]` — Request-specific configuration.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.review.<a href="src/peal/review/client.py#L384-L417">links</a>(...) -> typing.List[ReviewLink]</code></summary>
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

```python
from peal import Peal
from peal.environment import PealEnvironment

client = Peal(
    token="<token>",
    environment=PealEnvironment.DEFAULT,
)

client.review.links(
    workspace_id="workspaceId",
    post_id="postId",
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

**workspace_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**post_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `typing.Optional[RequestOptions]` — Request-specific configuration.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.review.<a href="src/peal/review/client.py#L419-L465">create_link</a>(...) -> CreatedReviewLink</code></summary>
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

```python
from peal import Peal
from peal.environment import PealEnvironment

client = Peal(
    token="<token>",
    environment=PealEnvironment.DEFAULT,
)

client.review.create_link(
    workspace_id="workspaceId",
    post_id="postId",
    access="view",
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

**workspace_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**post_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**access:** `ReviewLinkAccess` 
    
</dd>
</dl>

<dl>
<dd>

**expires_in_hours:** `typing.Optional[int]` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `typing.Optional[RequestOptions]` — Request-specific configuration.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.review.<a href="src/peal/review/client.py#L467-L500">revoke_link</a>(...) -> ReviewLink</code></summary>
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

```python
from peal import Peal
from peal.environment import PealEnvironment

client = Peal(
    token="<token>",
    environment=PealEnvironment.DEFAULT,
)

client.review.revoke_link(
    workspace_id="workspaceId",
    link_id="linkId",
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

**workspace_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**link_id:** `str` 
    
</dd>
</dl>

<dl>
<dd>

**request_options:** `typing.Optional[RequestOptions]` — Request-specific configuration.
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

