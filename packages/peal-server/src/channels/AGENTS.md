# Channels

- Channel tokens are encrypted with AES-256-GCM through `Aead`: a keyring read
  with `Config.Redacted("PEAL_TOKEN_KEYS")` (comma-separated `keyId:base64key`
  entries; the first encrypts, all decrypt), a random IV per value, stored as
  `<keyId>.<iv>.<ciphertext>`, and the channel id as additional authenticated
  data. `encryptSecret` and `decryptSecret` bind other secrets to
  `connect:<state>` or `app:<origin>` the same way.
- The keyring is optional: unset or blank, the server starts, encrypting fails
  with `MissingTokenKey` (connecting answers `ConnectFailed` `notConfigured`)
  and decrypting with `UnknownTokenKey`. A malformed keyring stops the server
  at startup. `token_key_id` records which key encrypted a row.
- Channels have their own OAuth flows and token tables. Better Auth's social
  providers are for signing in only.
- Platform sign-in goes through one `PlatformAuthorizer` per platform
  (`channels/application/platform-authorizer.ts`); Mastodon always, Bluesky
  when the server has a client for it, LinkedIn and X when the operator set
  their app (`<PLATFORM>_CLIENT_ID` and `_CLIENT_SECRET`, read by
  `oauthClientConfig`; one half alone stops the server), Facebook Pages and
  Instagram through a Page with `META_APP_ID`/`META_APP_SECRET`, Instagram
  through Instagram Login with `INSTAGRAM_APP_ID`/`INSTAGRAM_APP_SECRET`,
  Threads with
  `THREADS_APP_ID`/`THREADS_APP_SECRET`, TikTok with
  `TIKTOK_CLIENT_KEY`/`TIKTOK_CLIENT_SECRET` (`oauthClientConfig`'s
  `idSuffix`), YouTube with `YOUTUBE_CLIENT_ID` and `_CLIENT_SECRET` (a
  Google OAuth client), Pinterest with
  `PINTEREST_APP_ID`/`PINTEREST_APP_SECRET` (its `secretSuffix` too),
  Google Business Profile with `GOOGLE_BUSINESS_CLIENT_ID` and
  `_CLIENT_SECRET` (a client of its own: Google gives access to the
  Business Profile APIs, quotas and reviews by project). A platform
  without its settings is in
  `unconfigured`. Each declares its `TokenPolicy`, data in
  `channels/domain/token-policy.ts`, which the refresh sweep and the
  reconnect warnings follow: a LinkedIn profile's tokens are not renewed
  and expire after 60 days, as a company page's do unless its sign-in
  brought a refresh token (`linkedinPage`: renewed a week ahead), X's last two hours and rotate on refresh, as TikTok's do
  (`expires_in` decides; refresh tokens end 180 days after sign-in),
  Google's last an hour and do not rotate, Threads' and Instagram Login's
  (`instagramLogin`) last 60 days and renew themselves a week ahead,
  Pinterest's last 30 days and are renewed a week ahead, each refresh
  bringing a refresh token good for 60 days more, which replaces the one
  sent. A
  refreshable policy's `sweep` renews tokens `beforeExpiry` (`ahead` of it)
  or keeps them alive (`keepAlive`: only once `unused` that long past their
  expiry, the access being renewed when a call needs it, through
  `ChannelAccess`). X's, TikTok's and YouTube's keep alive after 30 days,
  rather than being renewed ahead of every expiry: a hours-long token is
  never swept `beforeExpiry`, which would refresh every channel a dozen
  times a day (a test lists each policy's sweep).
- `RefreshChannelTokens.sweep` (every 10 minutes) and
  `WarnChannelsNeedingReconnect` (daily) page through what is due by
  cursor (`dueForRefresh`, `needingReconnect`: `after`), never with a cap,
  which would leave the same channels behind at every run. The sweep takes
  the tokens about to lapse before the keep-alives, three channels at a
  time (one channel lock stays free for a post's renewal), and stops
  starting refreshes at its budget (8 minutes): it then logs a warning and
  sets `peal.channels.token_sweep.left` (with `.duration` and
  `.unfinished`). No publish depends on it: `ChannelAccess` renews an
  expired refreshable token however long ago it ran out.
- TikTok's Login Kit for Web takes no PKCE (TikTok asks it of desktop and
  mobile apps only): the state, bound to member and workspace, guards the
  callback, and a token answer naming an `error` is a refusal whatever its
  status. A `PlatformAuthorizer` may have `revoke` (TikTok's guidelines ask
  for it; Google takes it), which `DisconnectChannel` calls once the
  channel is deleted and no other channel, in any workspace, connects the
  same account (`ChannelRepository.accountInUse`), waiting 10 seconds at
  most and logging any failure.
- Pinterest's OAuth names no PKCE either, takes the app's id and secret as
  Basic credentials, and separates scopes with commas. Its errors are
  `{ code, message }`, never RFC 6749's: a 401 from the token endpoint
  refuses the app (the operator's to fix), any other refusal of a refresh
  the refresh token. Its API revokes tokens of system users only, so the
  authorizer has no `revoke`. `PINTEREST_SANDBOX=true`
  (`pinterestHostsConfig`, `#shared/infrastructure/platforms/pinterest-api.ts`)
  sends the authorizer's, the adapter's, the lookups' and the reader's
  calls to Pinterest's Sandbox, all an app with Trial access may write to:
  its tokens work nowhere else, and it takes no video and gives no
  analytics.
- `platformRegistrations` (`infrastructure/platforms/platform-addresses.ts`)
  lists every address a platform is given or reads (redirect URIs, Meta's
  data deletion and deauthorize callbacks, Bluesky's documents), from the
  authorizers' callback paths and the contract's routes;
  `nx run peal-server:platform-addresses` prints it, in the image too. A
  platform that gains a sign-in or a route its servers call joins it, with
  the settings that hold its app: `test/channels/container.test.ts` and
  `platform-addresses.test.ts` fail otherwise, and the infra's
  `test_cloudflared.py` when the sandbox's `peal_access_bypass_paths`
  would stop one. Docs point at the command rather than list addresses.
- `GET …/channels/platforms` (`ConnectChannel.connectable`, channel:connect)
  lists the platforms the server has an authorizer for, every platform's
  through the one registry; the web app's connect forms offer only those.
  Map a platform's own denial codes (LinkedIn's `user_cancelled_*`) to
  `AuthorizationDenied` in `connect-channel.ts`.
- A channel names the way in it came through on the platforms that have
  several (`ChannelConnectionSchema`, `#shared/domain/channel-connection.ts`:
  Instagram's two logins, LinkedIn's `linkedinProfile` and `linkedinPage`);
  one stored without any came the first way there was (`connectionOf`).
  The registry answers the authorizer of a platform and connection, and
  `linkedinConnections` beside `instagramConnections`.
- LinkedIn has two apps, as LinkedIn grants its Community Management API
  only to an app with no other product: `LINKEDIN_CLIENT_ID` connects
  members' profiles (OpenID Connect and `w_member_social`), and
  `LINKEDIN_PAGES_CLIENT_ID`/`_SECRET` company pages
  (`linkedin-pages-authorizer.ts`: `w_organization_social`,
  `r_organization_social`, `rw_organization_admin`, nothing of the member's
  profile). Both redirect to `/connect/linkedin/callback`; the attempt's
  connection picks the authorizer. The pages sign-in lists the member's
  approved roles (`organizationAcls`) and answers an `AccountChoice` of
  the pages they administer or write content for (`postingRoles`), each
  with the member's token and `urn:li:organization:<id>` as its account
  id, which no profile's can equal. A page's token is renewed only when
  LinkedIn gave a refresh token (approved partners): `tokenPolicies.linkedinPage`.
  Use finders, never batch reads (`ids=List(…)` on a collection): the
  Development tier refuses those, and gives 100 calls a member a day.
- Facebook Pages and Instagram share Facebook Login
  (`infrastructure/platforms/meta/facebook-login.ts`): a long-lived user
  token lists the user's Pages with their tokens, which never expire; an
  Instagram professional account posts with its Page's token. Their
  `complete` answers an `AccountChoice`: `ConnectChannel.complete` connects a
  single account at once, reconnects a channel's own, or keeps the accounts
  encrypted (`connect_choices`, `choice:<selection>`, 15 minutes, used once)
  for `choose`, which puts a choice back when it fails before connecting
  any account. `IssuedTokens.grantedBy` keeps the Facebook user a Page token
  rests on, in `channels.granted_by`. Threads has its own OAuth: a 60-day
  long-lived token that renews itself. Every Graph call through Facebook
  Login carries `appsecret_proof`
  (`#shared/infrastructure/platforms/meta-graph.ts`).
- Instagram has two ways in, one platform with a connection kind
  (`InstagramConnectionSchema` in `#shared/domain/instagram-connection.ts`,
  copied by the contract): `instagramLogin`, the default, and
  `facebookLogin`, through a Page. Channels, attempts and choices keep it
  (`connection`, null on other platforms; an Instagram row without one
  came through Facebook Login, `storedConnection`), and it picks the
  authorizer (`PlatformAuthorizers.for(platform, connection)`; for a new
  account without one, the first of `instagramConnections`, Instagram
  Login when configured), the token policy, the refresh, the publishing
  host and the insights scope. Everything else (text and media rules,
  options, analytics' list) is the platform's, so a channel can move
  between the two: connecting an account the workspace has through the
  other way reconnects its channel there. Instagram Login
  (`meta/instagram-login-authorizer.ts`, Business Login for Instagram:
  `www.instagram.com/oauth/authorize` with `force_reauth`, the code on
  `api.instagram.com`, then `ig_exchange_token` and `ig_refresh_token` on
  `graph.instagram.com`) needs `instagram_business_basic` and
  `instagram_business_content_publish` and asks for
  `instagram_business_manage_insights`, which a member may decline; its
  account id is `/me`'s `user_id`, and its `grantedBy` the app-scoped `id`,
  read again before each refresh so the renewed token keeps it. Its calls
  carry no `appsecret_proof`: the token is the Instagram app's.
- YouTube connects through Google's OAuth 2.0 web server flow
  (`infrastructure/platforms/youtube/youtube-authorizer.ts`): PKCE, offline
  access, `prompt=select_account consent`, and the scopes `youtube.upload`
  and `youtube.readonly` only; a sign-in that withheld one is
  `AuthorizationDenied`. The token is the channel's the owner picked on
  Google's chooser (brand accounts too), so `complete` answers the channels
  `channels.list?mine=true` lists as an `AccountChoice`: one connects at
  once, none is `NoAccountsToConnect`.
- Both Google products build on `googleOAuth`
  (`infrastructure/platforms/google/google-oauth.ts`): the sign-in, the
  exchange, the refresh and the revocation, with each product's client,
  scopes and settings' names. Change the flow there, never in one product.
- Google Business Profile (platform id `googleBusiness`) connects with the
  `business.manage` scope
  (`platforms/google-business/google-business-authorizer.ts`): `complete`
  lists the accounts the Google user reaches (Account Management API,
  20 a page), then each account's locations (Business Information API,
  100 a page, with the required `readMask`), and answers those with
  `metadata.hasVoiceOfMerchant` as an `AccountChoice`, `googleBusinessReach`
  at most (100 accounts, 200 locations): one channel per location, and no
  other location can post. A channel's `accountId` is the location's name
  in the My Business API v4, `accounts/{account}/locations/{location}`,
  which its posts are made under: a location reached through another
  account is another account id, so reconnecting through one answers
  `ReconnectAccountMismatch`. Its `handle` is the location's address (or
  store code), its `displayName` its title. A project Google has not given
  access has a quota of 0: every listing answers 429, which is
  `PlatformUnavailable`, and the log says to check the project.
- Meta's data deletion callbacks (`POST /api/data-deletion/:app`, no sign-in)
  check the `signed_request` HMAC with the app's secret (`SignedRequests`),
  delete the channels the user granted or owns in every workspace, and the
  account choices their sign-in offers (`connect_choices.granted_by`), record
  only the code, counts and the SHA-256 of the signed request
  (`data_deletions`), and answer the status page
  `PUBLIC_URL/data-deletion/<code>`. The same signed request sent again
  answers its first receipt and deletes nothing more. Each app (`facebook`,
  `instagram`, `threads`) answers for the channels it signs in
  (`channelsSignedInWith`): an Instagram Login channel only to `instagram`,
  which may name it by its grant or its account id. Their deauthorization
  callbacks (`POST /api/data-deletion/:app/deauthorize`,
  `DeauthorizePlatformUser`) mark those channels `refreshNeeded` under
  their locks and tell their workspaces; a channel changed after the
  request's `issued_at` is left alone, so a replay marks nothing reconnected
  since.
- `ConnectChannel` stores each attempt under the SHA-256 of its state, bound
  to the member, the workspace and the platform, for 15 minutes, completed
  once. One channel per platform account per workspace: connecting an account
  again reconnects its channel. Reconnecting adds no channel, so no plan
  limit refuses it, and its contract lists none.
- No route turns a channel off or back on (`disable` and `enable` are domain
  rules only), and reconnecting leaves a channel turned off as it is: notices
  and docs tell members to disconnect it and connect the account again.
- Any request to a host a user chose (a Mastodon instance, the servers a
  Bluesky DID names) goes through `publicHttpClient` or `publicFetch` from
  `#shared/infrastructure/platforms`: HTTPS on the default port only,
  addresses that are public after DNS resolution, no redirects, answers cut
  off past 1 MiB, 20-second timeout, no trace context. Tests swap the
  `OutboundGuard` for an open one only to reach loopback fakes.
- The AT Protocol OAuth client runs on Bun only with the handle resolver built
  on Peal's guarded fetch; its default one needs Node's undici.
- The refresh sweep takes each platform's cutoff from every way in the
  server has for it (`PlatformAuthorizers.every`), the latest one, then
  checks each channel against its own way in's policy: a platform's first
  authorizer may renew nothing (LinkedIn's profiles) while another does
  (its pages).
- Refresh a channel's tokens only inside `ChannelLocks.withLock` (Postgres
  advisory locks). A process holds at most four at once, each on a pool
  connection, so never nest `withLock`. Bluesky and X refresh tokens work
  once.
- Other contexts get a working token only from `ChannelAccess`
  (`channels/application/channel-access.ts`). `withToken` decrypts it,
  renews it under the channel's lock when it is due or the platform refused
  it once (reusing a token another call renewed meanwhile), and runs the call
  outside the lock, so never call it inside `withLock`. When renewing fails
  for good, or the renewed token is refused too, it marks the channel
  `refreshNeeded` and tells the workspace through `ChannelNotices`.
- A platform failure is temporary (`PlatformUnavailable`) when any server on
  the way answered 5xx or 429; only the platform's own refusal marks a channel
  `refreshNeeded`.
- A platform that refuses the server's app until its operator pays (X: 402
  once its pay-per-use credits are used up, `usage-capped` at its spending
  cap) is the operator's problem, never the post's or the account's: the
  adapter fails with `PlatformUnavailable` and a code of
  `operatorRefusalCodes` (`#publishing/domain/own-refusals.ts`), and the
  policy keeps the target waiting, retried every 30 minutes until 24 hours
  after its scheduled time (`operatorRefusal`), then fails it as
  `appBillingLimit`. These attempts use none of an outage's retries
  (`earlierRefusalsOf`). `publishAttemptRun` tells `OperatorAlerts` of
  each: `LoggedOperatorAlerts` counts it (`peal.publishing.app_refusals`)
  and logs an error (`event.name` `peal.app_refused`) at the first, then
  once an hour per code, never per post, which Grafana's `peal-app-refused`
  rule reports. A refresh answered so leaves the channel's token alone.
- A platform's data deletion request disconnects channels as a member does:
  `DrizzleDataDeletions` tells `ChannelEvents.disconnected` in its
  transaction, once per signed request. `channel.reconnect_needed` is
  published for a week after a channel enters `refreshNeeded` (`toldFor`),
  not each time the daily check tells it: its key is purged with its event.
- A token refresh run that stops at its budget makes the next one start
  after where it stopped, then come back to the channels before (in this
  process): channels whose platform hangs never take every run.
  `CollectMetrics` does the same between channels.

## Connect links

- A connect link (`ConnectLinks`, `channels.connect_links`) lets whoever
  holds its address connect an account of one platform to a workspace
  (those they pick, when the sign-in reached several, as a member's
  picker lets them), and nothing else, without a session: `POST …/connect-links`
  (channel:connect) answers the address once, and only the SHA-256 of its
  token is kept. It works once, for a sign-in that connects an account;
  opening it uses nothing. It lasts 7 days unless told (1 to 720 hours),
  starts 20 sign-ins at most, and a workspace has 100 pending at most; the
  `channels.connect-link-retention` cron deletes those ended 30 days ago.
  With `channelId` it reconnects that channel only. Its actor holds
  `channel:connect` alone (`linkActor`).
- A `returnUrl` is refused at creation unless its origin is one the
  workspace's partner registered, exactly (`ReturnOrigin`, which refuses
  wildcards; `PartnerOwnership.allowsReturnTo`; `ReturnUrlNotAllowed`), so
  a link is never an open redirect; a workspace without a partner takes
  none. The page returns with `peal_link` and `peal_status`, which anyone
  can write: the partner reads the link with its key, and
  `channel.connected` tells its server.
- The hosted steps (`HostedConnectApi`, `/api/connect-links`, with
  `/start`, `/complete` and `/accounts`) need no credentials but the
  link's token, in the `x-connect-link-token` header. A token never goes
  in an address: the server logs and traces every path it answers, and
  the page's address is `connect/link#<token>`, the fragment a browser
  keeps to itself. `test/app/secrets-in-logs.test.ts` runs the app as
  production does and searches what it logs and traces for each kind of
  credential: add a new one there.
  `ConnectLinkIntake` (`src/app/connect-links/`) counts 120 opens and 60
  steps an hour per address and asks a trusted `Origin` of every step that
  is not a GET. `start` binds the platform's state to the link and to a
  nonce in the `peal_connect_link` cookie (HttpOnly, SameSite=Lax, path
  `/api/connect-links`, Secure on HTTPS), set on the reply, never declared
  in the contract: `complete` and `accounts` refuse another browser. Never
  log a link's token or address.
- Erasure covers the new tables (`erasure.test.ts`): a workspace's links,
  its partner row and keys go with it; usage days name no person and go
  with the partner.
