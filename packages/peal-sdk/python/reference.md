# Reference
## system
<details><summary><code>client.system.<a href="src/peal/system/client.py#L25-L48">health</a>()</code></summary>
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

<details><summary><code>client.system.<a href="src/peal/system/client.py#L50-L73">ready</a>()</code></summary>
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
        "analytics:read"
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

**connection:** `typing.Optional[InstagramConnection]` 
    
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
<details><summary><code>client.posts.<a href="src/peal/posts/client.py#L34-L73">drafts</a>(...) -> DraftPage</code></summary>
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

<details><summary><code>client.posts.<a href="src/peal/posts/client.py#L75-L111">list</a>(...) -> typing.List[Post]</code></summary>
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

<details><summary><code>client.posts.<a href="src/peal/posts/client.py#L113-L173">create</a>(...) -> Post</code></summary>
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

<details><summary><code>client.posts.<a href="src/peal/posts/client.py#L175-L206">get</a>(...) -> Post</code></summary>
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

<details><summary><code>client.posts.<a href="src/peal/posts/client.py#L208-L277">update</a>(...) -> Post</code></summary>
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

<details><summary><code>client.posts.<a href="src/peal/posts/client.py#L279-L311">discard</a>(...)</code></summary>
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

<details><summary><code>client.posts.<a href="src/peal/posts/client.py#L313-L346">attempts</a>(...) -> typing.List[PublicationAttempt]</code></summary>
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

<details><summary><code>client.posts.<a href="src/peal/posts/client.py#L348-L399">schedule</a>(...) -> Post</code></summary>
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

<details><summary><code>client.posts.<a href="src/peal/posts/client.py#L401-L448">reschedule</a>(...) -> Post</code></summary>
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

<details><summary><code>client.posts.<a href="src/peal/posts/client.py#L450-L483">unschedule</a>(...) -> Post</code></summary>
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

<details><summary><code>client.posts.<a href="src/peal/posts/client.py#L485-L526">repost</a>(...) -> Post</code></summary>
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

<details><summary><code>client.posts.<a href="src/peal/posts/client.py#L528-L575">confirm</a>(...) -> Post</code></summary>
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

<details><summary><code>client.posts.<a href="src/peal/posts/client.py#L577-L610">cancel</a>(...) -> Post</code></summary>
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
    byte_size=1,
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

<details><summary><code>client.media.<a href="src/peal/media/client.py#L125-L158">get</a>(...) -> Media</code></summary>
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

<details><summary><code>client.media.<a href="src/peal/media/client.py#L160-L192">delete</a>(...)</code></summary>
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

<details><summary><code>client.media.<a href="src/peal/media/client.py#L194-L236">describe</a>(...) -> Media</code></summary>
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

<details><summary><code>client.media.<a href="src/peal/media/client.py#L238-L271">complete</a>(...) -> Media</code></summary>
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

<details><summary><code>client.media.<a href="src/peal/media/client.py#L273-L306">usage</a>(...) -> MediaUsage</code></summary>
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
<details><summary><code>client.billing.<a href="src/peal/billing/client.py#L26-L54">get</a>(...) -> Billing</code></summary>
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

Comments on a post, starts a thread about one of its channels or some words of its text there, or answers a thread. The text is kept as plain text, 2000 characters at most, without control characters. Those who follow the post are told. Needs post:create or post:approve.
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

Resolves the thread a comment started, or reopens it. An answer is not resolved: its thread is (CommentInvalid, `parent`). Needs post:create or post:approve.
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

<details><summary><code>client.review.<a href="src/peal/review/client.py#L277-L310">approve</a>(...) -> ApprovalOutcome</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Approves a post that waits for an approval: it is scheduled for the time it was asked for, and its job starts. Approved after that time (beyond a minute), nothing is published late: the post goes back to draft, still approved, and `late` is true; scheduling it again needs no new approval while it says the same. Recorded with who approved and when. Needs post:approve, and is refused to staff acting as a member.
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

<details><summary><code>client.review.<a href="src/peal/review/client.py#L312-L350">request_changes</a>(...) -> ChangesOutcome</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Sends a post that waits for an approval back to draft, with a comment that says what to change. Its author and whoever asked are told. Needs post:approve, and is refused to staff acting as a member.
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

<details><summary><code>client.review.<a href="src/peal/review/client.py#L352-L385">links</a>(...) -> typing.List[ReviewLink]</code></summary>
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

<details><summary><code>client.review.<a href="src/peal/review/client.py#L387-L433">create_link</a>(...) -> CreatedReviewLink</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Makes a link that shows a draft, a post that waits for an approval or a scheduled post to whoever holds it, without an account: the post as each channel will receive it, and nothing else of the workspace. It lets them view, comment, or approve, and works 14 days unless `expiresInHours` says otherwise (90 days at most), until it is revoked, or the post is published, cancelled or deleted. A post has 20 working links at most. The answer holds the link's address, which is not shown again. Needs post:approve, and is refused to staff acting as a member.
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

<details><summary><code>client.review.<a href="src/peal/review/client.py#L435-L468">revoke_link</a>(...) -> ReviewLink</code></summary>
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

