use crate::api::*;
use crate::{ApiError, ClientConfig, HttpClient, QueryBuilder, RequestOptions};
use reqwest::Method;

pub struct PostsClient {
    pub http_client: HttpClient,
}

impl PostsClient {
    pub fn new(config: ClientConfig) -> Result<Self, ApiError> {
        Ok(Self {
            http_client: HttpClient::new(config.clone())?,
        })
    }

    /// Lists the workspace's drafts, newest first, 20 a page unless `limit` (at most 50) says otherwise. Pass the page's `nextCursor` as `cursor` for the next one. Needs post:read.
    ///
    /// # Arguments
    ///
    /// * `options` - Additional request options such as headers, timeout, etc.
    ///
    /// # Returns
    ///
    /// JSON response from the API
    ///
    /// # Examples
    ///
    /// ```no_run
    /// use peal_sdk::prelude::*;
    ///
    /// #[tokio::main]
    /// async fn main() {
    ///     let config = ClientConfig {
    ///         token: Some("<token>".to_string()),
    ///         ..Default::default()
    ///     };
    ///     let client = PealClient::new(config).expect("Failed to build client");
    ///     client
    ///         .posts
    ///         .drafts(
    ///             &"workspaceId".to_string(),
    ///             &DraftsQueryRequest {
    ///                 ..Default::default()
    ///             },
    ///             None,
    ///         )
    ///         .await;
    /// }
    /// ```
    pub async fn drafts(
        &self,
        workspace_id: &str,
        request: &DraftsQueryRequest,
        options: Option<RequestOptions>,
    ) -> Result<DraftPage, ApiError> {
        self.http_client
            .execute_request(
                Method::GET,
                &format!("api/workspaces/{}/posts/drafts", workspace_id),
                None,
                QueryBuilder::new()
                    .string("cursor", request.cursor.clone())
                    .string("limit", request.limit.clone())
                    .build(),
                options,
            )
            .await
    }

    /// Lists the posts scheduled from `from` (included) to `to` (excluded), at most 62 days apart, by scheduled instant, with their channels and how each went. Drafts have no time and are not listed; cancelled posts are, with the time they had. Needs post:read.
    ///
    /// # Arguments
    ///
    /// * `options` - Additional request options such as headers, timeout, etc.
    ///
    /// # Returns
    ///
    /// JSON response from the API
    ///
    /// # Examples
    ///
    /// ```no_run
    /// use peal_sdk::prelude::*;
    ///
    /// #[tokio::main]
    /// async fn main() {
    ///     let config = ClientConfig {
    ///         token: Some("<token>".to_string()),
    ///         ..Default::default()
    ///     };
    ///     let client = PealClient::new(config).expect("Failed to build client");
    ///     client
    ///         .posts
    ///         .list(
    ///             &"workspaceId".to_string(),
    ///             &PostsListQueryRequest {
    ///                 from: "from".to_string(),
    ///                 to: "to".to_string(),
    ///             },
    ///             None,
    ///         )
    ///         .await;
    /// }
    /// ```
    pub async fn list(
        &self,
        workspace_id: &str,
        request: &PostsListQueryRequest,
        options: Option<RequestOptions>,
    ) -> Result<Vec<Post>, ApiError> {
        self.http_client
            .execute_request(
                Method::GET,
                &format!("api/workspaces/{}/posts", workspace_id),
                None,
                QueryBuilder::new()
                    .string("from", request.from.clone())
                    .string("to", request.to.clone())
                    .build(),
                options,
            )
            .await
    }

    /// Creates a draft for some of the workspace's channels, possibly none yet, with options on those whose platform takes them (`TargetOptions`, of the channel's platform). Its media must be the workspace's, and ready. Its text, media and options are checked against each platform's rules when it is scheduled, not before. It may name channel sets (`channelSets`, by id or name), whose connected channels it is for as well, with the options each set keeps; a channel of a set that is no longer connected is left out, and the answer says so (`warnings`). A channel on which it gives no options takes the channel's default options, if it has some. With `defaultSignatures`, each channel's default signature goes under its text, and `signatureId` puts one signature under it on every channel: a signature is then text of the post, never added under a text that already ends with it. Needs post:create, channel:read, and media:read when it shows media.
    ///
    /// # Arguments
    ///
    /// * `options` - Additional request options such as headers, timeout, etc.
    ///
    /// # Returns
    ///
    /// JSON response from the API
    ///
    /// # Examples
    ///
    /// ```no_run
    /// use peal_sdk::prelude::*;
    ///
    /// #[tokio::main]
    /// async fn main() {
    ///     let config = ClientConfig {
    ///         token: Some("<token>".to_string()),
    ///         ..Default::default()
    ///     };
    ///     let client = PealClient::new(config).expect("Failed to build client");
    ///     client
    ///         .posts
    ///         .create(
    ///             &"workspaceId".to_string(),
    ///             &PostDraft {
    ///                 channel_ids: vec!["channelIds".to_string()],
    ///                 content: PostContent {
    ///                     media: vec![MediaAttachment {
    ///                         alt_text: "altText".to_string(),
    ///                         media_id: "mediaId".to_string(),
    ///                         ..Default::default()
    ///                     }],
    ///                     overrides: vec![TextOverride {
    ///                         channel_id: "channelId".to_string(),
    ///                         text: "text".to_string(),
    ///                         ..Default::default()
    ///                     }],
    ///                     text: "text".to_string(),
    ///                     ..Default::default()
    ///                 },
    ///                 ..Default::default()
    ///             },
    ///             None,
    ///         )
    ///         .await;
    /// }
    /// ```
    pub async fn create(
        &self,
        workspace_id: &str,
        request: &PostDraft,
        options: Option<RequestOptions>,
    ) -> Result<Post, ApiError> {
        let options = {
            let mut o = options.unwrap_or_default();
            o.max_retries = Some(0);
            Some(o)
        };
        self.http_client
            .execute_request(
                Method::POST,
                &format!("api/workspaces/{}/posts", workspace_id),
                Some(serde_json::to_value(request).map_err(ApiError::Serialization)?),
                None,
                options,
            )
            .await
    }

    /// Lists the workspace's posts, whatever their state, a page at a time: 20 unless `limit` (at most 100) says otherwise. Every filter given must hold: `status` (draft, scheduled, publishing, finished, cancelled), `outcome` (how a finished post ended, such as `failed` or `partiallyPublished`), `channelId` (posts with a target on that channel), `platform` (posts with a target on a connected channel of that platform), `tagId` (posts filed under that tag), `queueId` (posts that queue placed), `recyclingId` (posts that recycling rule made), `removed` (`true`: posts Peal deleted from at least one channel's platform; `false`: posts deleted from none), `from` (included) and `to` (excluded), on the scheduled instant, which leave out posts without a time, `createdVia` (`web`, `apiKey` or `application`) and `authorId`. `sort` orders them by creation (`createdDesc`, the default, or `createdAsc`) or by scheduled instant (`scheduledDesc`, `scheduledAsc`, which list only posts with a time). Pass the page's `nextCursor` as `cursor`, with the same filters and sort, for the next page: a cursor marks where its page ended, so posts created, moved or deleted meanwhile make no page repeat or skip one; a cursor of another sort, or none a page gave, is a bad request. Each post comes whole, with its targets, their status, address and failure reason, and `channels` gives the platform of each channel the page names. Needs post:read and channel:read.
    ///
    /// # Arguments
    ///
    /// * `options` - Additional request options such as headers, timeout, etc.
    ///
    /// # Returns
    ///
    /// JSON response from the API
    ///
    /// # Examples
    ///
    /// ```no_run
    /// use peal_sdk::prelude::*;
    ///
    /// #[tokio::main]
    /// async fn main() {
    ///     let config = ClientConfig {
    ///         token: Some("<token>".to_string()),
    ///         ..Default::default()
    ///     };
    ///     let client = PealClient::new(config).expect("Failed to build client");
    ///     client
    ///         .posts
    ///         .search(
    ///             &"workspaceId".to_string(),
    ///             &SearchQueryRequest {
    ///                 ..Default::default()
    ///             },
    ///             None,
    ///         )
    ///         .await;
    /// }
    /// ```
    pub async fn search(
        &self,
        workspace_id: &str,
        request: &SearchQueryRequest,
        options: Option<RequestOptions>,
    ) -> Result<PostPage, ApiError> {
        self.http_client
            .execute_request(
                Method::GET,
                &format!("api/workspaces/{}/posts/search", workspace_id),
                None,
                QueryBuilder::new()
                    .string("authorId", request.author_id.clone())
                    .string("channelId", request.channel_id.clone())
                    .serialize("createdVia", request.created_via.clone())
                    .string("cursor", request.cursor.clone())
                    .string("from", request.from.clone())
                    .string("limit", request.limit.clone())
                    .serialize("outcome", request.outcome.clone())
                    .serialize("platform", request.platform.clone())
                    .string("queueId", request.queue_id.clone())
                    .string("recyclingId", request.recycling_id.clone())
                    .serialize("removed", request.removed.clone())
                    .serialize("sort", request.sort.clone())
                    .serialize("status", request.status.clone())
                    .string("tagId", request.tag_id.clone())
                    .string("to", request.to.clone())
                    .build(),
                options,
            )
            .await
    }

    /// Creates a post and sends it to some of the workspace's channels in one call: `when` is `now`, which publishes at once, `at` an instant, kept with its IANA time zone, or `queue`, which puts it on the next free slot of a queue (`queueId`, or the workspace's default queue), decided when the request is received so that posts sent together never take the same slot; it is then an ordinary scheduled post, through every rule a time chosen by hand goes through, the plan's room counted in the slot's month (PlanLimitReached, never a later month), and with no channel or channel set named it goes to the queue's (QueueHasNoRoom when the queue has no free slot within 366 days). Instead of listing channels, or beside them, it may name channel sets (`channelSets`, by id or name): it goes to their connected channels, with the options each set keeps where it gives none, and a channel of a set that is no longer connected is left out and told in the answer's `warnings`, never silently; a set none of whose channels is left, with no other channel, is refused (UnknownChannels). A channel on which it gives no options takes the channel's default options. `defaultSignatures` puts each channel's default signature under its text, and `signatureId` one signature on every channel: signatures are text of the post, counted against each platform's limit, and never added twice. It goes through every rule scheduling a draft does (each platform's limits on text, media and options, the account's own, the plan's), and answers every violation at once (PostContentInvalid): nothing is made then. In a workspace that asks for approvals, a post that needs one is answered with the status `awaitingApproval`: it keeps its time and goes out only once it is approved. What it publishes reaches the platforms' public, and cannot be taken back from Peal once it is out; until its time, cancel or unschedule it. Send an `Idempotency-Key` header (any text of your choosing, at most 255 characters, such as a UUID) to make a request safe to send again: within 24 hours, the same key with the same body answers the post the first request made, as it now stands, and makes no other; the same key with another body is refused (IdempotencyKeyReused), and answers PostNotFound once that post was deleted. Keys are kept per workspace, as digests. Apart from keys, a post whose content already goes to one of its channels less than 23 hours from its time is refused (DuplicatePost), as a request made twice by mistake would be, unless it says `allowDuplicate: true`; scheduling a draft is not checked. It answers as soon as the post is made, while it publishes, unless `wait` says to wait for the outcome: up to that many seconds (60 at most) for a post that goes out now, the answer is then the post once every channel has its result (`status` `finished`, with its `outcome`, each target `published` with its `permalink` or `failed` with its `failureReason`), or the post as it stands when the time runs out, some targets still `pending` or `publishing`: it goes on publishing, and `GET …/posts/{postId}/outcome` waits for the rest. The answer is 201 either way: the post was made. Needs post:schedule and channel:read, and media:read when it shows media; an OAuth client needs the scope workspace:publish.
    ///
    /// # Arguments
    ///
    /// * `options` - Additional request options such as headers, timeout, etc.
    ///
    /// # Returns
    ///
    /// JSON response from the API
    ///
    /// # Examples
    ///
    /// ```no_run
    /// use peal_sdk::prelude::*;
    ///
    /// #[tokio::main]
    /// async fn main() {
    ///     let config = ClientConfig {
    ///         token: Some("<token>".to_string()),
    ///         ..Default::default()
    ///     };
    ///     let client = PealClient::new(config).expect("Failed to build client");
    ///     client
    ///         .posts
    ///         .send(
    ///             &"workspaceId".to_string(),
    ///             &NewPost {
    ///                 channel_ids: vec!["channelIds".to_string()],
    ///                 content: PostContent {
    ///                     media: vec![MediaAttachment {
    ///                         alt_text: "altText".to_string(),
    ///                         media_id: "mediaId".to_string(),
    ///                         ..Default::default()
    ///                     }],
    ///                     overrides: vec![TextOverride {
    ///                         channel_id: "channelId".to_string(),
    ///                         text: "text".to_string(),
    ///                         ..Default::default()
    ///                     }],
    ///                     text: "text".to_string(),
    ///                     ..Default::default()
    ///                 },
    ///                 when: PostTiming::Now {
    ///                     data: PostTimingNow {
    ///                         ..Default::default()
    ///                     },
    ///                 },
    ///                 wait: None,
    ///                 allow_duplicate: None,
    ///                 channel_sets: None,
    ///                 default_signatures: None,
    ///                 options: None,
    ///                 signature_id: None,
    ///                 tag_ids: None,
    ///             },
    ///             None,
    ///         )
    ///         .await;
    /// }
    /// ```
    pub async fn send(
        &self,
        workspace_id: &str,
        request: &NewPost,
        options: Option<RequestOptions>,
    ) -> Result<Post, ApiError> {
        let options = {
            let mut o = options.unwrap_or_default();
            o.max_retries = Some(0);
            Some(o)
        };
        self.http_client
            .execute_request(
                Method::POST,
                &format!("api/workspaces/{}/posts/send", workspace_id),
                Some(serde_json::to_value(request).map_err(ApiError::Serialization)?),
                QueryBuilder::new()
                    .string("wait", request.wait.clone())
                    .build(),
                options,
            )
            .await
    }

    /// Creates and sends up to 50 posts in one request, each as `send` would: one post per item, each with its own channels, content, options and time, so the same content at several times, or at a time of its own on each channel, is several items. Items are taken in order, one at a time, each on its own: one refused keeps none of the others from being made, and nothing is undone. The answer is 200 whenever the request itself was read, even if every item was refused: `items` says, for each by its place in the request, `created` with its post, or `refused` with what `send` would have answered for it alone (its content's violations, unknown channels or media, a time gone by, the plan's limit, a duplicate). A request that cannot be read at all (malformed, no item, more than 50) is 400, and makes nothing. The plan's limits hold across the request: once the month has no room, the items left are refused. Each item is checked against the posts made before it, the request's earlier items included, for the same content on the same channel (DuplicatePost). An `Idempotency-Key` header makes the whole request safe to send again within 24 hours: each item is kept under the key and its place, so the same request sent again answers the posts it made (`replayed`), makes those that were not made the first time if they now can be, and an item that changed under the same key is refused (IdempotencyKeyReused). An item's own `idempotencyKey` is used instead of the header's for that item. Needs post:schedule and channel:read, and media:read for the items that show media; an OAuth client needs the scope workspace:publish.
    ///
    /// # Arguments
    ///
    /// * `options` - Additional request options such as headers, timeout, etc.
    ///
    /// # Returns
    ///
    /// JSON response from the API
    ///
    /// # Examples
    ///
    /// ```no_run
    /// use peal_sdk::prelude::*;
    ///
    /// #[tokio::main]
    /// async fn main() {
    ///     let config = ClientConfig {
    ///         token: Some("<token>".to_string()),
    ///         ..Default::default()
    ///     };
    ///     let client = PealClient::new(config).expect("Failed to build client");
    ///     client
    ///         .posts
    ///         .bulk(
    ///             &"workspaceId".to_string(),
    ///             &BulkPosts {
    ///                 posts: vec![BulkPost {
    ///                     allow_duplicate: None,
    ///                     channel_ids: vec!["channelIds".to_string()],
    ///                     channel_sets: None,
    ///                     content: PostContent {
    ///                         media: vec![MediaAttachment {
    ///                             alt_text: "altText".to_string(),
    ///                             media_id: "mediaId".to_string(),
    ///                             ..Default::default()
    ///                         }],
    ///                         overrides: vec![TextOverride {
    ///                             channel_id: "channelId".to_string(),
    ///                             text: "text".to_string(),
    ///                             ..Default::default()
    ///                         }],
    ///                         text: "text".to_string(),
    ///                         ..Default::default()
    ///                     },
    ///                     default_signatures: None,
    ///                     options: None,
    ///                     signature_id: None,
    ///                     tag_ids: None,
    ///                     when: PostTiming::Now {
    ///                         data: PostTimingNow {
    ///                             ..Default::default()
    ///                         },
    ///                     },
    ///                     idempotency_key: None,
    ///                 }],
    ///             },
    ///             None,
    ///         )
    ///         .await;
    /// }
    /// ```
    pub async fn bulk(
        &self,
        workspace_id: &str,
        request: &BulkPosts,
        options: Option<RequestOptions>,
    ) -> Result<BulkResult, ApiError> {
        let options = {
            let mut o = options.unwrap_or_default();
            o.max_retries = Some(0);
            Some(o)
        };
        self.http_client
            .execute_request(
                Method::POST,
                &format!("api/workspaces/{}/posts/bulk", workspace_id),
                Some(serde_json::to_value(request).map_err(ApiError::Serialization)?),
                None,
                options,
            )
            .await
    }

    /// Creates and sends the posts a CSV file lists, one per row, at most 100 rows under its first line, which names the columns, in any order: `text` and `channels` (channel ids separated by spaces, commas or semicolons) are required columns, `at` too (`now`, an instant with its offset such as 2026-11-20T09:00:00Z, or a local time without one such as 2026-11-20 10:00, read in the row's `time_zone`, an IANA zone, UTC if left out); `media` (ids of ready media of the workspace), `allow_duplicate` (`true` or `false`) and `idempotency_key` are optional. Cells follow RFC 4180, strictly: a cell with a comma, a quote or a line break is written between double quotes, a quote inside it doubled; a quote anywhere else is ImportUnreadable (`strayQuote`). Blank lines are no rows. The file is checked first, every row, as `validate` checks a post and as the file it is (a row an earlier row leaves no room for in its month, one that repeats an earlier row's content near its time, and one that carries an earlier row's key with another post are refused; a row with more or fewer cells than the first line names is unreadable, never guessed); unless every row is valid, nothing is made, and `rows` says which are `valid`, `refused` (with what `send` would have answered) or `unreadable` (with the cells at fault). `dryRun` stops there even when every row is valid. Otherwise the rows are then made in order as `bulk` makes its items, each `created` or, when something changed since the check or a row repeats an earlier one, `refused`. The answer is 200 once the file was read; a file that cannot be read at all is ImportUnreadable. An `Idempotency-Key` header works as on `bulk`, by row. Needs post:schedule, post:read and channel:read, and media:read for rows with media; an OAuth client needs the scope workspace:publish.
    ///
    /// # Arguments
    ///
    /// * `options` - Additional request options such as headers, timeout, etc.
    ///
    /// # Returns
    ///
    /// JSON response from the API
    ///
    /// # Examples
    ///
    /// ```no_run
    /// use peal_sdk::prelude::*;
    ///
    /// #[tokio::main]
    /// async fn main() {
    ///     let config = ClientConfig {
    ///         token: Some("<token>".to_string()),
    ///         ..Default::default()
    ///     };
    ///     let client = PealClient::new(config).expect("Failed to build client");
    ///     client
    ///         .posts
    ///         .import(
    ///             &"workspaceId".to_string(),
    ///             &PostImport {
    ///                 csv: "csv".to_string(),
    ///                 dry_run: None,
    ///             },
    ///             None,
    ///         )
    ///         .await;
    /// }
    /// ```
    pub async fn import(
        &self,
        workspace_id: &str,
        request: &PostImport,
        options: Option<RequestOptions>,
    ) -> Result<ImportResult, ApiError> {
        let options = {
            let mut o = options.unwrap_or_default();
            o.max_retries = Some(0);
            Some(o)
        };
        self.http_client
            .execute_request(
                Method::POST,
                &format!("api/workspaces/{}/posts/import", workspace_id),
                Some(serde_json::to_value(request).map_err(ApiError::Serialization)?),
                None,
                options,
            )
            .await
    }

    /// Checks a post without making it, and changes nothing: send what `send` takes, or a draft (no `when`). It answers 200 whether or not the post would go through, with `valid` and everything that would refuse it, all at once: per channel, the text the channel receives, counted as its platform counts it against each of its limits, its hashtags, mentions, links and media, and every violation of the platform's rules (text, media formats, sizes, counts and durations, options) and of the account's own where its platform tells them; the channels and media that are not the workspace's; and, when `when` is given, whether the time can be kept (for `queue`, the slot it would take now, `queueSlot`, or why there is none, `queueNoRoom`: QueueNotFound when the queue is not the workspace's), whether the workspace's plan has room, and the channels that already have the same content from another post (`duplicates`, as DuplicatePost tells them; none with `allowDuplicate`). A post that is valid now can still be refused later: a channel disconnected, a plan's month filled meanwhile. Needs post:read and channel:read, and media:read when it shows media.
    ///
    /// # Arguments
    ///
    /// * `options` - Additional request options such as headers, timeout, etc.
    ///
    /// # Returns
    ///
    /// JSON response from the API
    ///
    /// # Examples
    ///
    /// ```no_run
    /// use peal_sdk::prelude::*;
    ///
    /// #[tokio::main]
    /// async fn main() {
    ///     let config = ClientConfig {
    ///         token: Some("<token>".to_string()),
    ///         ..Default::default()
    ///     };
    ///     let client = PealClient::new(config).expect("Failed to build client");
    ///     client
    ///         .posts
    ///         .validate(
    ///             &"workspaceId".to_string(),
    ///             &PostToValidate {
    ///                 channel_ids: vec!["channelIds".to_string()],
    ///                 content: PostContent {
    ///                     media: vec![MediaAttachment {
    ///                         alt_text: "altText".to_string(),
    ///                         media_id: "mediaId".to_string(),
    ///                         ..Default::default()
    ///                     }],
    ///                     overrides: vec![TextOverride {
    ///                         channel_id: "channelId".to_string(),
    ///                         text: "text".to_string(),
    ///                         ..Default::default()
    ///                     }],
    ///                     text: "text".to_string(),
    ///                     ..Default::default()
    ///                 },
    ///                 allow_duplicate: None,
    ///                 channel_sets: None,
    ///                 default_signatures: None,
    ///                 options: None,
    ///                 signature_id: None,
    ///                 when: None,
    ///             },
    ///             None,
    ///         )
    ///         .await;
    /// }
    /// ```
    pub async fn validate(
        &self,
        workspace_id: &str,
        request: &PostToValidate,
        options: Option<RequestOptions>,
    ) -> Result<PostValidation, ApiError> {
        let options = {
            let mut o = options.unwrap_or_default();
            o.max_retries = Some(0);
            Some(o)
        };
        self.http_client
            .execute_request(
                Method::POST,
                &format!("api/workspaces/{}/posts/validate", workspace_id),
                Some(serde_json::to_value(request).map_err(ApiError::Serialization)?),
                None,
                options,
            )
            .await
    }

    /// Answers with a post of the workspace. Needs post:read.
    ///
    /// # Arguments
    ///
    /// * `options` - Additional request options such as headers, timeout, etc.
    ///
    /// # Returns
    ///
    /// JSON response from the API
    ///
    /// # Examples
    ///
    /// ```no_run
    /// use peal_sdk::prelude::*;
    ///
    /// #[tokio::main]
    /// async fn main() {
    ///     let config = ClientConfig {
    ///         token: Some("<token>".to_string()),
    ///         ..Default::default()
    ///     };
    ///     let client = PealClient::new(config).expect("Failed to build client");
    ///     client
    ///         .posts
    ///         .get(&"workspaceId".to_string(), &"postId".to_string(), None)
    ///         .await;
    /// }
    /// ```
    pub async fn get(
        &self,
        workspace_id: &str,
        post_id: &str,
        options: Option<RequestOptions>,
    ) -> Result<Post, ApiError> {
        self.http_client
            .execute_request(
                Method::GET,
                &format!("api/workspaces/{}/posts/{}", workspace_id, post_id),
                None,
                None,
                options,
            )
            .await
    }

    /// Replaces a draft's content, channels and options: options left out are removed. Its tags are replaced by `tagIds` when given, and kept otherwise. A post that is no longer a draft is a conflict. Needs post:update, channel:read, and media:read when it shows media.
    ///
    /// # Arguments
    ///
    /// * `options` - Additional request options such as headers, timeout, etc.
    ///
    /// # Returns
    ///
    /// JSON response from the API
    ///
    /// # Examples
    ///
    /// ```no_run
    /// use peal_sdk::prelude::*;
    ///
    /// #[tokio::main]
    /// async fn main() {
    ///     let config = ClientConfig {
    ///         token: Some("<token>".to_string()),
    ///         ..Default::default()
    ///     };
    ///     let client = PealClient::new(config).expect("Failed to build client");
    ///     client
    ///         .posts
    ///         .update(
    ///             &"workspaceId".to_string(),
    ///             &"postId".to_string(),
    ///             &PostDraft {
    ///                 channel_ids: vec!["channelIds".to_string()],
    ///                 content: PostContent {
    ///                     media: vec![MediaAttachment {
    ///                         alt_text: "altText".to_string(),
    ///                         media_id: "mediaId".to_string(),
    ///                         ..Default::default()
    ///                     }],
    ///                     overrides: vec![TextOverride {
    ///                         channel_id: "channelId".to_string(),
    ///                         text: "text".to_string(),
    ///                         ..Default::default()
    ///                     }],
    ///                     text: "text".to_string(),
    ///                     ..Default::default()
    ///                 },
    ///                 ..Default::default()
    ///             },
    ///             None,
    ///         )
    ///         .await;
    /// }
    /// ```
    pub async fn update(
        &self,
        workspace_id: &str,
        post_id: &str,
        request: &PostDraft,
        options: Option<RequestOptions>,
    ) -> Result<Post, ApiError> {
        self.http_client
            .execute_request(
                Method::PUT,
                &format!("api/workspaces/{}/posts/{}", workspace_id, post_id),
                Some(serde_json::to_value(request).map_err(ApiError::Serialization)?),
                None,
                options,
            )
            .await
    }

    /// Deletes a draft. A post scheduled or sent is a conflict: cancel it instead. Needs post:delete, or post:update for the user who created the draft.
    ///
    /// # Arguments
    ///
    /// * `options` - Additional request options such as headers, timeout, etc.
    ///
    /// # Returns
    ///
    /// Empty response
    ///
    /// # Examples
    ///
    /// ```no_run
    /// use peal_sdk::prelude::*;
    ///
    /// #[tokio::main]
    /// async fn main() {
    ///     let config = ClientConfig {
    ///         token: Some("<token>".to_string()),
    ///         ..Default::default()
    ///     };
    ///     let client = PealClient::new(config).expect("Failed to build client");
    ///     client
    ///         .posts
    ///         .discard(&"workspaceId".to_string(), &"postId".to_string(), None)
    ///         .await;
    /// }
    /// ```
    pub async fn discard(
        &self,
        workspace_id: &str,
        post_id: &str,
        options: Option<RequestOptions>,
    ) -> Result<(), ApiError> {
        self.http_client
            .execute_request(
                Method::DELETE,
                &format!("api/workspaces/{}/posts/{}", workspace_id, post_id),
                None,
                None,
                options,
            )
            .await
    }

    /// Answers with a post once it has gone out: it waits up to `wait` seconds (60 at most; none unless given) until every channel has its result, and answers the post then (`status` `finished`), or as it stands when the time runs out, which a client asks again. A draft, a cancelled post and a post scheduled for later than the wait are answered at once. Waiting changes nothing and holds nothing: the post publishes in its own job either way. Needs post:read.
    ///
    /// # Arguments
    ///
    /// * `options` - Additional request options such as headers, timeout, etc.
    ///
    /// # Returns
    ///
    /// JSON response from the API
    ///
    /// # Examples
    ///
    /// ```no_run
    /// use peal_sdk::prelude::*;
    ///
    /// #[tokio::main]
    /// async fn main() {
    ///     let config = ClientConfig {
    ///         token: Some("<token>".to_string()),
    ///         ..Default::default()
    ///     };
    ///     let client = PealClient::new(config).expect("Failed to build client");
    ///     client
    ///         .posts
    ///         .outcome(
    ///             &"workspaceId".to_string(),
    ///             &"postId".to_string(),
    ///             &OutcomeQueryRequest {
    ///                 ..Default::default()
    ///             },
    ///             None,
    ///         )
    ///         .await;
    /// }
    /// ```
    pub async fn outcome(
        &self,
        workspace_id: &str,
        post_id: &str,
        request: &OutcomeQueryRequest,
        options: Option<RequestOptions>,
    ) -> Result<Post, ApiError> {
        self.http_client
            .execute_request(
                Method::GET,
                &format!("api/workspaces/{}/posts/{}/outcome", workspace_id, post_id),
                None,
                QueryBuilder::new()
                    .string("wait", request.wait.clone())
                    .build(),
                options,
            )
            .await
    }

    /// Lists every attempt Peal made at publishing the post, by channel, round and attempt, with how each ended. An attempt still in progress is not listed yet. Needs post:read.
    ///
    /// # Arguments
    ///
    /// * `options` - Additional request options such as headers, timeout, etc.
    ///
    /// # Returns
    ///
    /// JSON response from the API
    ///
    /// # Examples
    ///
    /// ```no_run
    /// use peal_sdk::prelude::*;
    ///
    /// #[tokio::main]
    /// async fn main() {
    ///     let config = ClientConfig {
    ///         token: Some("<token>".to_string()),
    ///         ..Default::default()
    ///     };
    ///     let client = PealClient::new(config).expect("Failed to build client");
    ///     client
    ///         .posts
    ///         .attempts(&"workspaceId".to_string(), &"postId".to_string(), None)
    ///         .await;
    /// }
    /// ```
    pub async fn attempts(
        &self,
        workspace_id: &str,
        post_id: &str,
        options: Option<RequestOptions>,
    ) -> Result<Vec<PublicationAttempt>, ApiError> {
        self.http_client
            .execute_request(
                Method::GET,
                &format!("api/workspaces/{}/posts/{}/attempts", workspace_id, post_id),
                None,
                None,
                options,
            )
            .await
    }

    /// Files a post under these tags of the workspace, 10 at most, instead of those it had; an empty list takes them all off. Tags say nothing to the platforms, so a post takes them whatever its status, sent or not. Needs post:update.
    ///
    /// # Arguments
    ///
    /// * `options` - Additional request options such as headers, timeout, etc.
    ///
    /// # Returns
    ///
    /// JSON response from the API
    ///
    /// # Examples
    ///
    /// ```no_run
    /// use peal_sdk::prelude::*;
    ///
    /// #[tokio::main]
    /// async fn main() {
    ///     let config = ClientConfig {
    ///         token: Some("<token>".to_string()),
    ///         ..Default::default()
    ///     };
    ///     let client = PealClient::new(config).expect("Failed to build client");
    ///     client
    ///         .posts
    ///         .tag(
    ///             &"workspaceId".to_string(),
    ///             &"postId".to_string(),
    ///             &PostTags {
    ///                 tag_ids: vec!["tagIds".to_string()],
    ///             },
    ///             None,
    ///         )
    ///         .await;
    /// }
    /// ```
    pub async fn tag(
        &self,
        workspace_id: &str,
        post_id: &str,
        request: &PostTags,
        options: Option<RequestOptions>,
    ) -> Result<Post, ApiError> {
        self.http_client
            .execute_request(
                Method::PUT,
                &format!("api/workspaces/{}/posts/{}/tags", workspace_id, post_id),
                Some(serde_json::to_value(request).map_err(ApiError::Serialization)?),
                None,
                options,
            )
            .await
    }

    /// Makes a new draft that says what the post says, whatever the post's status: its text, its media, its channels with their text and options, and its tags. What the workspace no longer has is left out rather than refused: a channel disconnected since, with the text the post had there, media deleted since, a tag deleted since. The copy has no time, and its author is whoever asked; the post itself is not changed. Needs post:read and post:create, and channel:read.
    ///
    /// # Arguments
    ///
    /// * `options` - Additional request options such as headers, timeout, etc.
    ///
    /// # Returns
    ///
    /// JSON response from the API
    ///
    /// # Examples
    ///
    /// ```no_run
    /// use peal_sdk::prelude::*;
    ///
    /// #[tokio::main]
    /// async fn main() {
    ///     let config = ClientConfig {
    ///         token: Some("<token>".to_string()),
    ///         ..Default::default()
    ///     };
    ///     let client = PealClient::new(config).expect("Failed to build client");
    ///     client
    ///         .posts
    ///         .duplicate(&"workspaceId".to_string(), &"postId".to_string(), None)
    ///         .await;
    /// }
    /// ```
    pub async fn duplicate(
        &self,
        workspace_id: &str,
        post_id: &str,
        options: Option<RequestOptions>,
    ) -> Result<Post, ApiError> {
        let options = {
            let mut o = options.unwrap_or_default();
            o.max_retries = Some(0);
            Some(o)
        };
        self.http_client
            .execute_request(
                Method::POST,
                &format!(
                    "api/workspaces/{}/posts/{}/duplicate",
                    workspace_id, post_id
                ),
                None,
                None,
                options,
            )
            .await
    }

    /// Schedules a draft on some of the workspace's channels at an instant, kept with the IANA time zone it was chosen in. The content must fit each platform's rules, its media included: file types, sizes, durations, dimensions, alt text, how many videos, and whether images and videos go together. A channel whose platform takes options needs those it requires, as the draft gives them on that channel: a channel the draft was not for has none yet. A time up to a minute ago publishes now. On a server that bills, the posts going out in that month (UTC) must fit the workspace's plan (PlanLimitReached). Where the workspace asks for an approval of this post (its approval policy), the post is not scheduled: it answers with the status `awaitingApproval`, keeps its time, and goes out only once approved; contributors may then ask too, with post:create. Needs post:schedule and channel:read, and media:read when it shows media.
    ///
    /// # Arguments
    ///
    /// * `options` - Additional request options such as headers, timeout, etc.
    ///
    /// # Returns
    ///
    /// JSON response from the API
    ///
    /// # Examples
    ///
    /// ```no_run
    /// use peal_sdk::prelude::*;
    ///
    /// #[tokio::main]
    /// async fn main() {
    ///     let config = ClientConfig {
    ///         token: Some("<token>".to_string()),
    ///         ..Default::default()
    ///     };
    ///     let client = PealClient::new(config).expect("Failed to build client");
    ///     client
    ///         .posts
    ///         .schedule(
    ///             &"workspaceId".to_string(),
    ///             &"postId".to_string(),
    ///             &SchedulePost {
    ///                 at: "at".to_string(),
    ///                 channel_ids: vec!["channelIds".to_string()],
    ///                 time_zone: "timeZone".to_string(),
    ///             },
    ///             None,
    ///         )
    ///         .await;
    /// }
    /// ```
    pub async fn schedule(
        &self,
        workspace_id: &str,
        post_id: &str,
        request: &SchedulePost,
        options: Option<RequestOptions>,
    ) -> Result<Post, ApiError> {
        let options = {
            let mut o = options.unwrap_or_default();
            o.max_retries = Some(0);
            Some(o)
        };
        self.http_client
            .execute_request(
                Method::POST,
                &format!("api/workspaces/{}/posts/{}/schedule", workspace_id, post_id),
                Some(serde_json::to_value(request).map_err(ApiError::Serialization)?),
                None,
                options,
            )
            .await
    }

    /// Moves a scheduled post, or one awaiting approval, to another instant, or schedules a draft on the channels it has. A post that needs an approval it does not have waits for it (`awaitingApproval`). Moved to another month, or scheduled, it must fit that month's posts in the workspace's plan (PlanLimitReached). Needs post:schedule, and channel:read for a draft.
    ///
    /// # Arguments
    ///
    /// * `options` - Additional request options such as headers, timeout, etc.
    ///
    /// # Returns
    ///
    /// JSON response from the API
    ///
    /// # Examples
    ///
    /// ```no_run
    /// use peal_sdk::prelude::*;
    ///
    /// #[tokio::main]
    /// async fn main() {
    ///     let config = ClientConfig {
    ///         token: Some("<token>".to_string()),
    ///         ..Default::default()
    ///     };
    ///     let client = PealClient::new(config).expect("Failed to build client");
    ///     client
    ///         .posts
    ///         .reschedule(
    ///             &"workspaceId".to_string(),
    ///             &"postId".to_string(),
    ///             &PostSchedule {
    ///                 at: "at".to_string(),
    ///                 time_zone: "timeZone".to_string(),
    ///                 ..Default::default()
    ///             },
    ///             None,
    ///         )
    ///         .await;
    /// }
    /// ```
    pub async fn reschedule(
        &self,
        workspace_id: &str,
        post_id: &str,
        request: &PostSchedule,
        options: Option<RequestOptions>,
    ) -> Result<Post, ApiError> {
        let options = {
            let mut o = options.unwrap_or_default();
            o.max_retries = Some(0);
            Some(o)
        };
        self.http_client
            .execute_request(
                Method::POST,
                &format!(
                    "api/workspaces/{}/posts/{}/reschedule",
                    workspace_id, post_id
                ),
                Some(serde_json::to_value(request).map_err(ApiError::Serialization)?),
                None,
                options,
            )
            .await
    }

    /// Puts a post on the next free slot of a queue (`queueId`, or the workspace's default queue), decided when the request is received so that posts added together never take the same slot. A draft is scheduled there as `schedule` schedules it, on `channelIds` when given, on the channels it has otherwise, or, when it has none, where the same content sent with `when: queue` would go: the queue's connected channels and its channel set's, with the options the set keeps and the channels' default options; a channel of either that is no longer connected is left out and told in `warnings` (`queueChannelsDropped`, `channelsDropped`), and none left is UnknownChannels; a scheduled post, or one awaiting approval, is moved there as `reschedule` moves it, on the channels it has. Every rule of scheduling applies at that time, the approval gate and the plan's room in the slot's month included (PlanLimitReached, never a later month). A queue without a free slot within 366 days is QueueHasNoRoom, and nothing is changed. Needs post:schedule and channel:read.
    ///
    /// # Arguments
    ///
    /// * `options` - Additional request options such as headers, timeout, etc.
    ///
    /// # Returns
    ///
    /// JSON response from the API
    ///
    /// # Examples
    ///
    /// ```no_run
    /// use peal_sdk::prelude::*;
    ///
    /// #[tokio::main]
    /// async fn main() {
    ///     let config = ClientConfig {
    ///         token: Some("<token>".to_string()),
    ///         ..Default::default()
    ///     };
    ///     let client = PealClient::new(config).expect("Failed to build client");
    ///     client
    ///         .posts
    ///         .enqueue(
    ///             &"workspaceId".to_string(),
    ///             &"postId".to_string(),
    ///             &QueuePost {
    ///                 ..Default::default()
    ///             },
    ///             None,
    ///         )
    ///         .await;
    /// }
    /// ```
    pub async fn enqueue(
        &self,
        workspace_id: &str,
        post_id: &str,
        request: &QueuePost,
        options: Option<RequestOptions>,
    ) -> Result<Post, ApiError> {
        let options = {
            let mut o = options.unwrap_or_default();
            o.max_retries = Some(0);
            Some(o)
        };
        self.http_client
            .execute_request(
                Method::POST,
                &format!("api/workspaces/{}/posts/{}/queue", workspace_id, post_id),
                Some(serde_json::to_value(request).map_err(ApiError::Serialization)?),
                None,
                options,
            )
            .await
    }

    /// Takes a scheduled post back to draft, so its text and media can change: it goes out at no time until it is scheduled again. A post already publishing is a conflict. Needs post:schedule.
    ///
    /// # Arguments
    ///
    /// * `options` - Additional request options such as headers, timeout, etc.
    ///
    /// # Returns
    ///
    /// JSON response from the API
    ///
    /// # Examples
    ///
    /// ```no_run
    /// use peal_sdk::prelude::*;
    ///
    /// #[tokio::main]
    /// async fn main() {
    ///     let config = ClientConfig {
    ///         token: Some("<token>".to_string()),
    ///         ..Default::default()
    ///     };
    ///     let client = PealClient::new(config).expect("Failed to build client");
    ///     client
    ///         .posts
    ///         .unschedule(&"workspaceId".to_string(), &"postId".to_string(), None)
    ///         .await;
    /// }
    /// ```
    pub async fn unschedule(
        &self,
        workspace_id: &str,
        post_id: &str,
        options: Option<RequestOptions>,
    ) -> Result<Post, ApiError> {
        let options = {
            let mut o = options.unwrap_or_default();
            o.max_retries = Some(0);
            Some(o)
        };
        self.http_client
            .execute_request(
                Method::POST,
                &format!(
                    "api/workspaces/{}/posts/{}/unschedule",
                    workspace_id, post_id
                ),
                None,
                None,
                options,
            )
            .await
    }

    /// Sends the post again, now, on one channel where it failed or is unconfirmed: a new round, with its own attempts. Check the platform first when it is unconfirmed, as it may be live already. A post of several parts goes on from the part after the last that is live; one failed as `partsNotSent` is refused (TargetStatusConflict), as Peal has no post to send the rest under: a part found by hand has no id, or the part to reply to is gone. Needs post:schedule.
    ///
    /// # Arguments
    ///
    /// * `options` - Additional request options such as headers, timeout, etc.
    ///
    /// # Returns
    ///
    /// JSON response from the API
    ///
    /// # Examples
    ///
    /// ```no_run
    /// use peal_sdk::prelude::*;
    ///
    /// #[tokio::main]
    /// async fn main() {
    ///     let config = ClientConfig {
    ///         token: Some("<token>".to_string()),
    ///         ..Default::default()
    ///     };
    ///     let client = PealClient::new(config).expect("Failed to build client");
    ///     client
    ///         .posts
    ///         .repost(
    ///             &"workspaceId".to_string(),
    ///             &"postId".to_string(),
    ///             &"targetId".to_string(),
    ///             None,
    ///         )
    ///         .await;
    /// }
    /// ```
    pub async fn repost(
        &self,
        workspace_id: &str,
        post_id: &str,
        target_id: &str,
        options: Option<RequestOptions>,
    ) -> Result<Post, ApiError> {
        let options = {
            let mut o = options.unwrap_or_default();
            o.max_retries = Some(0);
            Some(o)
        };
        self.http_client
            .execute_request(
                Method::POST,
                &format!(
                    "api/workspaces/{}/posts/{}/targets/{}/repost",
                    workspace_id, post_id, target_id
                ),
                None,
                None,
                options,
            )
            .await
    }

    /// Says what you found on the platform for a post unconfirmed on one channel: `published`, with its address if you have it, or `notPublished`, which fails it there so it can be reposted. Its notifications are marked read. Needs post:schedule.
    ///
    /// # Arguments
    ///
    /// * `options` - Additional request options such as headers, timeout, etc.
    ///
    /// # Returns
    ///
    /// JSON response from the API
    ///
    /// # Examples
    ///
    /// ```no_run
    /// use peal_sdk::prelude::*;
    ///
    /// #[tokio::main]
    /// async fn main() {
    ///     let config = ClientConfig {
    ///         token: Some("<token>".to_string()),
    ///         ..Default::default()
    ///     };
    ///     let client = PealClient::new(config).expect("Failed to build client");
    ///     client
    ///         .posts
    ///         .confirm(
    ///             &"workspaceId".to_string(),
    ///             &"postId".to_string(),
    ///             &"targetId".to_string(),
    ///             &TargetConfirmation::Published {
    ///                 data: TargetConfirmationPublished {
    ///                     permalink: None,
    ///                     ..Default::default()
    ///                 },
    ///             },
    ///             None,
    ///         )
    ///         .await;
    /// }
    /// ```
    pub async fn confirm(
        &self,
        workspace_id: &str,
        post_id: &str,
        target_id: &str,
        request: &TargetConfirmation,
        options: Option<RequestOptions>,
    ) -> Result<Post, ApiError> {
        let options = {
            let mut o = options.unwrap_or_default();
            o.max_retries = Some(0);
            Some(o)
        };
        self.http_client
            .execute_request(
                Method::POST,
                &format!(
                    "api/workspaces/{}/posts/{}/targets/{}/confirm",
                    workspace_id, post_id, target_id
                ),
                Some(serde_json::to_value(request).map_err(ApiError::Serialization)?),
                None,
                options,
            )
            .await
    }

    /// Deletes the post from one channel's platform, for everyone: every part of a thread, the last first, so a deletion that stops midway leaves a shorter thread that still reads from its start. It cannot be undone from Peal. The request is accepted (202) and a job deletes it, one call at a time with the channel's other calls; a part the platform no longer has counts as deleted (`alreadyGone`), and a call that fails is tried again (as long as the platform asks to wait, and five more times while it cannot be reached), after which the change is `failed` with its `code` and asking again deletes the parts left. `wait` waits up to that many seconds (60 at most) for the change to end, and answers it as it then stands. Once done, the target keeps the status `published` with its `removedAt` (the month's count and the usage stay, as the post did go out), analytics stops reading it and keeps what it read, and the inbox stops reading its comments and keeps those it has. Refused (LivePostNotChangeable) before anything is called where it is not live there, was deleted already, Peal has no id for a part of it, the platform does not let Peal delete it (the capabilities' `livePost` say so beforehand), another change of it is pending, the channel cannot be used, or a boost that is not over shows it. Webhooks hear `post.unpublished` or `post.unpublish_failed`. Needs post:publish; an OAuth client needs the scope workspace:publish.
    ///
    /// # Arguments
    ///
    /// * `options` - Additional request options such as headers, timeout, etc.
    ///
    /// # Returns
    ///
    /// JSON response from the API
    ///
    /// # Examples
    ///
    /// ```no_run
    /// use peal_sdk::prelude::*;
    ///
    /// #[tokio::main]
    /// async fn main() {
    ///     let config = ClientConfig {
    ///         token: Some("<token>".to_string()),
    ///         ..Default::default()
    ///     };
    ///     let client = PealClient::new(config).expect("Failed to build client");
    ///     client
    ///         .posts
    ///         .unpublish_target(
    ///             &"workspaceId".to_string(),
    ///             &"postId".to_string(),
    ///             &"targetId".to_string(),
    ///             &UnpublishTargetQueryRequest {
    ///                 ..Default::default()
    ///             },
    ///             None,
    ///         )
    ///         .await;
    /// }
    /// ```
    pub async fn unpublish_target(
        &self,
        workspace_id: &str,
        post_id: &str,
        target_id: &str,
        request: &UnpublishTargetQueryRequest,
        options: Option<RequestOptions>,
    ) -> Result<LivePostChange, ApiError> {
        let options = {
            let mut o = options.unwrap_or_default();
            o.max_retries = Some(0);
            Some(o)
        };
        self.http_client
            .execute_request(
                Method::POST,
                &format!(
                    "api/workspaces/{}/posts/{}/targets/{}/unpublish",
                    workspace_id, post_id, target_id
                ),
                None,
                QueryBuilder::new()
                    .string("wait", request.wait.clone())
                    .build(),
                options,
            )
            .await
    }

    /// Replaces the text of one part of the post (`part`, from 0, the post itself by default) on one channel's platform, for everyone: only the text changes, never the media, the options or the time. The change is public at once. Peal edits on Mastodon and Google Business Profile; the capabilities' `livePost.edit` say where, and `editBlockedBy` why not elsewhere. The text is checked as that channel's text is when a post is scheduled (PostContentInvalid, a Mastodon content warning counted), and must not be empty. The request is accepted (202) and a job makes the edit, one call at a time with the channel's other calls; a call that fails is tried again as a deletion is, after which the change is `failed` with its `code` (`postGone` when the platform no longer has the post, `pollNotEditable` for a Mastodon post with a poll, which the edit would remove, `permissionDenied` for a Mastodon channel to reconnect) and may be asked again. `wait` waits up to that many seconds (60 at most) for it to end. Once done, the text is that part's own text on that channel in Peal (the other channels keep theirs), the target has its `editedAt`, and Peal keeps no earlier text. Refused (LivePostNotChangeable) before anything is called where it is not live there, was deleted, Peal has no id for that part, the platform does not let Peal edit it, another change of it is pending, the channel cannot be used, or your posts need an approval (`approvalRequired`: an approver makes the edit). Webhooks hear `post.edited` or `post.edit_failed`. Needs post:publish; an OAuth client needs the scope workspace:publish.
    ///
    /// # Arguments
    ///
    /// * `options` - Additional request options such as headers, timeout, etc.
    ///
    /// # Returns
    ///
    /// JSON response from the API
    ///
    /// # Examples
    ///
    /// ```no_run
    /// use peal_sdk::prelude::*;
    ///
    /// #[tokio::main]
    /// async fn main() {
    ///     let config = ClientConfig {
    ///         token: Some("<token>".to_string()),
    ///         ..Default::default()
    ///     };
    ///     let client = PealClient::new(config).expect("Failed to build client");
    ///     client
    ///         .posts
    ///         .edit_target(
    ///             &"workspaceId".to_string(),
    ///             &"postId".to_string(),
    ///             &"targetId".to_string(),
    ///             &LivePostEdit {
    ///                 text: "text".to_string(),
    ///                 wait: None,
    ///                 part: None,
    ///             },
    ///             None,
    ///         )
    ///         .await;
    /// }
    /// ```
    pub async fn edit_target(
        &self,
        workspace_id: &str,
        post_id: &str,
        target_id: &str,
        request: &LivePostEdit,
        options: Option<RequestOptions>,
    ) -> Result<LivePostChange, ApiError> {
        let options = {
            let mut o = options.unwrap_or_default();
            o.max_retries = Some(0);
            Some(o)
        };
        self.http_client
            .execute_request(
                Method::POST,
                &format!(
                    "api/workspaces/{}/posts/{}/targets/{}/edit",
                    workspace_id, post_id, target_id
                ),
                Some(serde_json::to_value(request).map_err(ApiError::Serialization)?),
                QueryBuilder::new()
                    .string("wait", request.wait.clone())
                    .build(),
                options,
            )
            .await
    }

    /// Deletes the post from every channel's platform where it can be, as unpublishing it on each channel does, and answers the change made on each (`changes`) and, beside them, why it could not be on the others (`refused`, each with the target and the reason LivePostNotChangeable gives): one channel that cannot never fails the whole request. It cannot be undone from Peal. Needs post:publish; an OAuth client needs the scope workspace:publish.
    ///
    /// # Arguments
    ///
    /// * `options` - Additional request options such as headers, timeout, etc.
    ///
    /// # Returns
    ///
    /// JSON response from the API
    ///
    /// # Examples
    ///
    /// ```no_run
    /// use peal_sdk::prelude::*;
    ///
    /// #[tokio::main]
    /// async fn main() {
    ///     let config = ClientConfig {
    ///         token: Some("<token>".to_string()),
    ///         ..Default::default()
    ///     };
    ///     let client = PealClient::new(config).expect("Failed to build client");
    ///     client
    ///         .posts
    ///         .unpublish(&"workspaceId".to_string(), &"postId".to_string(), None)
    ///         .await;
    /// }
    /// ```
    pub async fn unpublish(
        &self,
        workspace_id: &str,
        post_id: &str,
        options: Option<RequestOptions>,
    ) -> Result<PostUnpublish, ApiError> {
        let options = {
            let mut o = options.unwrap_or_default();
            o.max_retries = Some(0);
            Some(o)
        };
        self.http_client
            .execute_request(
                Method::POST,
                &format!(
                    "api/workspaces/{}/posts/{}/unpublish",
                    workspace_id, post_id
                ),
                None,
                None,
                options,
            )
            .await
    }

    /// Lists the changes asked of the post once it was live (deleting it from a channel's platform, or editing its text there), newest first, each with its `kind` and where it stands: `pending`, `done` or `failed` with its `code`. Needs post:read.
    ///
    /// # Arguments
    ///
    /// * `options` - Additional request options such as headers, timeout, etc.
    ///
    /// # Returns
    ///
    /// JSON response from the API
    ///
    /// # Examples
    ///
    /// ```no_run
    /// use peal_sdk::prelude::*;
    ///
    /// #[tokio::main]
    /// async fn main() {
    ///     let config = ClientConfig {
    ///         token: Some("<token>".to_string()),
    ///         ..Default::default()
    ///     };
    ///     let client = PealClient::new(config).expect("Failed to build client");
    ///     client
    ///         .posts
    ///         .changes(&"workspaceId".to_string(), &"postId".to_string(), None)
    ///         .await;
    /// }
    /// ```
    pub async fn changes(
        &self,
        workspace_id: &str,
        post_id: &str,
        options: Option<RequestOptions>,
    ) -> Result<LivePostChanges, ApiError> {
        self.http_client
            .execute_request(
                Method::GET,
                &format!("api/workspaces/{}/posts/{}/changes", workspace_id, post_id),
                None,
                None,
                options,
            )
            .await
    }

    /// Cancels a draft, a scheduled post or one awaiting approval. A post already publishing finishes with what its channels did: those not yet sent are cancelled. Needs post:schedule.
    ///
    /// # Arguments
    ///
    /// * `options` - Additional request options such as headers, timeout, etc.
    ///
    /// # Returns
    ///
    /// JSON response from the API
    ///
    /// # Examples
    ///
    /// ```no_run
    /// use peal_sdk::prelude::*;
    ///
    /// #[tokio::main]
    /// async fn main() {
    ///     let config = ClientConfig {
    ///         token: Some("<token>".to_string()),
    ///         ..Default::default()
    ///     };
    ///     let client = PealClient::new(config).expect("Failed to build client");
    ///     client
    ///         .posts
    ///         .cancel(&"workspaceId".to_string(), &"postId".to_string(), None)
    ///         .await;
    /// }
    /// ```
    pub async fn cancel(
        &self,
        workspace_id: &str,
        post_id: &str,
        options: Option<RequestOptions>,
    ) -> Result<Post, ApiError> {
        let options = {
            let mut o = options.unwrap_or_default();
            o.max_retries = Some(0);
            Some(o)
        };
        self.http_client
            .execute_request(
                Method::POST,
                &format!("api/workspaces/{}/posts/{}/cancel", workspace_id, post_id),
                None,
                None,
                options,
            )
            .await
    }
}
