<?php

namespace Peal\Posts;

use Psr\Http\Client\ClientInterface;
use Peal\Core\Client\RawClient;
use Peal\Posts\Requests\DraftsPostsRequest;
use Peal\Types\DraftPage;
use Peal\Exceptions\PealException;
use Peal\Exceptions\PealApiException;
use Peal\Core\Json\JsonApiRequest;
use Peal\Environments;
use Peal\Core\Client\HttpMethod;
use JsonException;
use Psr\Http\Client\ClientExceptionInterface;
use Peal\Posts\Requests\ListPostsRequest;
use Peal\Types\Post;
use Peal\Core\Json\JsonDecoder;
use Peal\Posts\Requests\CreatePostsRequest;
use Peal\Posts\Requests\SearchPostsRequest;
use Peal\Types\PostPage;
use Peal\Posts\Requests\NewPost;
use Peal\Posts\Requests\BulkPosts;
use Peal\Types\BulkResult;
use Peal\Posts\Requests\PostImport;
use Peal\Types\ImportResult;
use Peal\Posts\Requests\PostToValidate;
use Peal\Types\PostValidation;
use Peal\Posts\Requests\UpdatePostsRequest;
use Peal\Posts\Requests\OutcomePostsRequest;
use Peal\Types\PublicationAttempt;
use Peal\Posts\Requests\PostTags;
use Peal\Posts\Requests\SchedulePost;
use Peal\Posts\Requests\ReschedulePostsRequest;
use Peal\Posts\Requests\QueuePost;
use Peal\Posts\Requests\ConfirmPostsRequest;
use Peal\Posts\Requests\UnpublishTargetPostsRequest;
use Peal\Types\LivePostChange;
use Peal\Types\PostUnpublish;
use Peal\Types\LivePostChanges;

class PostsClient
{
    /**
     * @var array{
     *   baseUrl?: string,
     *   client?: ClientInterface,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     * } $options @phpstan-ignore-next-line Property is used in endpoint methods via HttpEndpointGenerator
     */
    private array $options;

    /**
     * @var RawClient $client
     */
    private RawClient $client;

    /**
     * @param RawClient $client
     * @param ?array{
     *   baseUrl?: string,
     *   client?: ClientInterface,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     * } $options
     */
    public function __construct(
        RawClient $client,
        ?array $options = null,
    ) {
        $this->client = $client;
        $this->options = $options ?? [];
    }

    /**
     * Lists the workspace's drafts, newest first, 20 a page unless `limit` (at most 50) says otherwise. Pass the page's `nextCursor` as `cursor` for the next one. Needs post:read.
     *
     * Example:
     * ```php
     * $client->posts->drafts(
     *     'workspaceId',
     *     new DraftsPostsRequest([]),
     * );
     * ```
     *
     * @param string $workspaceId
     * @param DraftsPostsRequest $request
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?DraftPage
     * @throws PealException
     * @throws PealApiException
     */
    public function drafts(string $workspaceId, DraftsPostsRequest $request = new DraftsPostsRequest(), ?array $options = null): ?DraftPage
    {
        $options = array_merge($this->options, $options ?? []);
        $query = [];
        if ($request->cursor != null) {
            $query['cursor'] = $request->cursor;
        }
        if ($request->limit != null) {
            $query['limit'] = $request->limit;
        }
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/workspaces/{$workspaceId}/posts/drafts",
                    method: HttpMethod::GET,
                    query: $query,
                ),
                $options,
            );
            $statusCode = $response->getStatusCode();
            if ($statusCode >= 200 && $statusCode < 400) {
                $json = $response->getBody()->getContents();
                if (empty($json)) {
                    return null;
                }
                return DraftPage::fromJson($json);
            }
        } catch (JsonException $e) {
            throw new PealException(message: "Failed to deserialize response: {$e->getMessage()}", previous: $e);
        } catch (ClientExceptionInterface $e) {
            throw new PealException(message: $e->getMessage(), previous: $e);
        }
        throw new PealApiException(
            message: 'API request failed',
            statusCode: $statusCode,
            body: $response->getBody()->getContents(),
        );
    }

    /**
     * Lists the posts scheduled from `from` (included) to `to` (excluded), at most 62 days apart, by scheduled instant, with their channels and how each went. Drafts have no time and are not listed; cancelled posts are, with the time they had. Needs post:read.
     *
     * Example:
     * ```php
     * $client->posts->list(
     *     'workspaceId',
     *     new ListPostsRequest([
     *         'from' => 'from',
     *         'to' => 'to',
     *     ]),
     * );
     * ```
     *
     * @param string $workspaceId
     * @param ListPostsRequest $request
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?array<Post>
     * @throws PealException
     * @throws PealApiException
     */
    public function list(string $workspaceId, ListPostsRequest $request, ?array $options = null): ?array
    {
        $options = array_merge($this->options, $options ?? []);
        $query = [];
        $query['from'] = $request->from;
        $query['to'] = $request->to;
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/workspaces/{$workspaceId}/posts",
                    method: HttpMethod::GET,
                    query: $query,
                ),
                $options,
            );
            $statusCode = $response->getStatusCode();
            if ($statusCode >= 200 && $statusCode < 400) {
                $json = $response->getBody()->getContents();
                if (empty($json)) {
                    return null;
                }
                return JsonDecoder::decodeArray($json, [Post::class]); // @phpstan-ignore-line
            }
        } catch (JsonException $e) {
            throw new PealException(message: "Failed to deserialize response: {$e->getMessage()}", previous: $e);
        } catch (ClientExceptionInterface $e) {
            throw new PealException(message: $e->getMessage(), previous: $e);
        }
        throw new PealApiException(
            message: 'API request failed',
            statusCode: $statusCode,
            body: $response->getBody()->getContents(),
        );
    }

    /**
     * Creates a draft for some of the workspace's channels, possibly none yet, with options on those whose platform takes them (`TargetOptions`, of the channel's platform). Its media must be the workspace's, and ready. Its text, media and options are checked against each platform's rules when it is scheduled, not before. It may name channel sets (`channelSets`, by id or name), whose connected channels it is for as well, with the options each set keeps; a channel of a set that is no longer connected is left out, and the answer says so (`warnings`). A channel on which it gives no options takes the channel's default options, if it has some. With `defaultSignatures`, each channel's default signature goes under its text, and `signatureId` puts one signature under it on every channel: a signature is then text of the post, never added under a text that already ends with it. Needs post:create, channel:read, and media:read when it shows media.
     *
     * Example:
     * ```php
     * $client->posts->create(
     *     'workspaceId',
     *     new CreatePostsRequest([
     *         'body' => new PostDraft([
     *             'channelIds' => [
     *                 'channelIds',
     *             ],
     *             'content' => new PostContent([
     *                 'media' => [
     *                     new MediaAttachment([
     *                         'altText' => 'altText',
     *                         'mediaId' => 'mediaId',
     *                     ]),
     *                 ],
     *                 'overrides' => [
     *                     new TextOverride([
     *                         'channelId' => 'channelId',
     *                         'text' => 'text',
     *                     ]),
     *                 ],
     *                 'text' => 'text',
     *             ]),
     *         ]),
     *     ]),
     * );
     * ```
     *
     * @param string $workspaceId
     * @param CreatePostsRequest $request
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?Post
     * @throws PealException
     * @throws PealApiException
     */
    public function create(string $workspaceId, CreatePostsRequest $request, ?array $options = null): ?Post
    {
        $options = array_merge($this->options, $options ?? []);
        $options['maxRetries'] = 0;
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/workspaces/{$workspaceId}/posts",
                    method: HttpMethod::POST,
                    body: $request->body,
                ),
                $options,
            );
            $statusCode = $response->getStatusCode();
            if ($statusCode >= 200 && $statusCode < 400) {
                $json = $response->getBody()->getContents();
                if (empty($json)) {
                    return null;
                }
                return Post::fromJson($json);
            }
        } catch (JsonException $e) {
            throw new PealException(message: "Failed to deserialize response: {$e->getMessage()}", previous: $e);
        } catch (ClientExceptionInterface $e) {
            throw new PealException(message: $e->getMessage(), previous: $e);
        }
        throw new PealApiException(
            message: 'API request failed',
            statusCode: $statusCode,
            body: $response->getBody()->getContents(),
        );
    }

    /**
     * Lists the workspace's posts, whatever their state, a page at a time: 20 unless `limit` (at most 100) says otherwise. Every filter given must hold: `status` (draft, scheduled, publishing, finished, cancelled), `outcome` (how a finished post ended, such as `failed` or `partiallyPublished`), `channelId` (posts with a target on that channel), `platform` (posts with a target on a connected channel of that platform), `tagId` (posts filed under that tag), `queueId` (posts that queue placed), `removed` (`true`: posts Peal deleted from at least one channel's platform; `false`: posts deleted from none), `from` (included) and `to` (excluded), on the scheduled instant, which leave out posts without a time, `createdVia` (`web`, `apiKey` or `application`) and `authorId`. `sort` orders them by creation (`createdDesc`, the default, or `createdAsc`) or by scheduled instant (`scheduledDesc`, `scheduledAsc`, which list only posts with a time). Pass the page's `nextCursor` as `cursor`, with the same filters and sort, for the next page: a cursor marks where its page ended, so posts created, moved or deleted meanwhile make no page repeat or skip one; a cursor of another sort, or none a page gave, is a bad request. Each post comes whole, with its targets, their status, address and failure reason, and `channels` gives the platform of each channel the page names. Needs post:read and channel:read.
     *
     * Example:
     * ```php
     * $client->posts->search(
     *     'workspaceId',
     *     new SearchPostsRequest([]),
     * );
     * ```
     *
     * @param string $workspaceId
     * @param SearchPostsRequest $request
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?PostPage
     * @throws PealException
     * @throws PealApiException
     */
    public function search(string $workspaceId, SearchPostsRequest $request = new SearchPostsRequest(), ?array $options = null): ?PostPage
    {
        $options = array_merge($this->options, $options ?? []);
        $query = [];
        if ($request->authorId != null) {
            $query['authorId'] = $request->authorId;
        }
        if ($request->channelId != null) {
            $query['channelId'] = $request->channelId;
        }
        if ($request->createdVia != null) {
            $query['createdVia'] = $request->createdVia;
        }
        if ($request->cursor != null) {
            $query['cursor'] = $request->cursor;
        }
        if ($request->from != null) {
            $query['from'] = $request->from;
        }
        if ($request->limit != null) {
            $query['limit'] = $request->limit;
        }
        if ($request->outcome != null) {
            $query['outcome'] = $request->outcome;
        }
        if ($request->platform != null) {
            $query['platform'] = $request->platform;
        }
        if ($request->queueId != null) {
            $query['queueId'] = $request->queueId;
        }
        if ($request->removed != null) {
            $query['removed'] = $request->removed;
        }
        if ($request->sort != null) {
            $query['sort'] = $request->sort;
        }
        if ($request->status != null) {
            $query['status'] = $request->status;
        }
        if ($request->tagId != null) {
            $query['tagId'] = $request->tagId;
        }
        if ($request->to != null) {
            $query['to'] = $request->to;
        }
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/workspaces/{$workspaceId}/posts/search",
                    method: HttpMethod::GET,
                    query: $query,
                ),
                $options,
            );
            $statusCode = $response->getStatusCode();
            if ($statusCode >= 200 && $statusCode < 400) {
                $json = $response->getBody()->getContents();
                if (empty($json)) {
                    return null;
                }
                return PostPage::fromJson($json);
            }
        } catch (JsonException $e) {
            throw new PealException(message: "Failed to deserialize response: {$e->getMessage()}", previous: $e);
        } catch (ClientExceptionInterface $e) {
            throw new PealException(message: $e->getMessage(), previous: $e);
        }
        throw new PealApiException(
            message: 'API request failed',
            statusCode: $statusCode,
            body: $response->getBody()->getContents(),
        );
    }

    /**
     * Creates a post and sends it to some of the workspace's channels in one call: `when` is `now`, which publishes at once, `at` an instant, kept with its IANA time zone, or `queue`, which puts it on the next free slot of a queue (`queueId`, or the workspace's default queue), decided when the request is received so that posts sent together never take the same slot; it is then an ordinary scheduled post, through every rule a time chosen by hand goes through, the plan's room counted in the slot's month (PlanLimitReached, never a later month), and with no channel or channel set named it goes to the queue's (QueueHasNoRoom when the queue has no free slot within 366 days). Instead of listing channels, or beside them, it may name channel sets (`channelSets`, by id or name): it goes to their connected channels, with the options each set keeps where it gives none, and a channel of a set that is no longer connected is left out and told in the answer's `warnings`, never silently; a set none of whose channels is left, with no other channel, is refused (UnknownChannels). A channel on which it gives no options takes the channel's default options. `defaultSignatures` puts each channel's default signature under its text, and `signatureId` one signature on every channel: signatures are text of the post, counted against each platform's limit, and never added twice. It goes through every rule scheduling a draft does (each platform's limits on text, media and options, the account's own, the plan's), and answers every violation at once (PostContentInvalid): nothing is made then. In a workspace that asks for approvals, a post that needs one is answered with the status `awaitingApproval`: it keeps its time and goes out only once it is approved. What it publishes reaches the platforms' public, and cannot be taken back from Peal once it is out; until its time, cancel or unschedule it. Send an `Idempotency-Key` header (any text of your choosing, at most 255 characters, such as a UUID) to make a request safe to send again: within 24 hours, the same key with the same body answers the post the first request made, as it now stands, and makes no other; the same key with another body is refused (IdempotencyKeyReused), and answers PostNotFound once that post was deleted. Keys are kept per workspace, as digests. Apart from keys, a post whose content already goes to one of its channels less than 23 hours from its time is refused (DuplicatePost), as a request made twice by mistake would be, unless it says `allowDuplicate: true`; scheduling a draft is not checked. It answers as soon as the post is made, while it publishes, unless `wait` says to wait for the outcome: up to that many seconds (60 at most) for a post that goes out now, the answer is then the post once every channel has its result (`status` `finished`, with its `outcome`, each target `published` with its `permalink` or `failed` with its `failureReason`), or the post as it stands when the time runs out, some targets still `pending` or `publishing`: it goes on publishing, and `GET …/posts/{postId}/outcome` waits for the rest. The answer is 201 either way: the post was made. Needs post:schedule and channel:read, and media:read when it shows media; an OAuth client needs the scope workspace:publish.
     *
     * Example:
     * ```php
     * $client->posts->send(
     *     'workspaceId',
     *     new NewPost([
     *         'channelIds' => [
     *             'channelIds',
     *         ],
     *         'content' => new PostContent([
     *             'media' => [
     *                 new MediaAttachment([
     *                     'altText' => 'altText',
     *                     'mediaId' => 'mediaId',
     *                 ]),
     *             ],
     *             'overrides' => [
     *                 new TextOverride([
     *                     'channelId' => 'channelId',
     *                     'text' => 'text',
     *                 ]),
     *             ],
     *             'text' => 'text',
     *         ]),
     *         'when' => PostTiming::now(new PostTimingNow([])),
     *     ]),
     * );
     * ```
     *
     * @param string $workspaceId
     * @param NewPost $request
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?Post
     * @throws PealException
     * @throws PealApiException
     */
    public function send(string $workspaceId, NewPost $request, ?array $options = null): ?Post
    {
        $options = array_merge($this->options, $options ?? []);
        $options['maxRetries'] = 0;
        $query = [];
        if ($request->wait != null) {
            $query['wait'] = $request->wait;
        }
        $headers = [];
        if ($request->idempotencyKey != null) {
            $headers['idempotency-key'] = $request->idempotencyKey;
        }
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/workspaces/{$workspaceId}/posts/send",
                    method: HttpMethod::POST,
                    headers: $headers,
                    query: $query,
                    body: $request,
                ),
                $options,
            );
            $statusCode = $response->getStatusCode();
            if ($statusCode >= 200 && $statusCode < 400) {
                $json = $response->getBody()->getContents();
                if (empty($json)) {
                    return null;
                }
                return Post::fromJson($json);
            }
        } catch (JsonException $e) {
            throw new PealException(message: "Failed to deserialize response: {$e->getMessage()}", previous: $e);
        } catch (ClientExceptionInterface $e) {
            throw new PealException(message: $e->getMessage(), previous: $e);
        }
        throw new PealApiException(
            message: 'API request failed',
            statusCode: $statusCode,
            body: $response->getBody()->getContents(),
        );
    }

    /**
     * Creates and sends up to 50 posts in one request, each as `send` would: one post per item, each with its own channels, content, options and time, so the same content at several times, or at a time of its own on each channel, is several items. Items are taken in order, one at a time, each on its own: one refused keeps none of the others from being made, and nothing is undone. The answer is 200 whenever the request itself was read, even if every item was refused: `items` says, for each by its place in the request, `created` with its post, or `refused` with what `send` would have answered for it alone (its content's violations, unknown channels or media, a time gone by, the plan's limit, a duplicate). A request that cannot be read at all (malformed, no item, more than 50) is 400, and makes nothing. The plan's limits hold across the request: once the month has no room, the items left are refused. Each item is checked against the posts made before it, the request's earlier items included, for the same content on the same channel (DuplicatePost). An `Idempotency-Key` header makes the whole request safe to send again within 24 hours: each item is kept under the key and its place, so the same request sent again answers the posts it made (`replayed`), makes those that were not made the first time if they now can be, and an item that changed under the same key is refused (IdempotencyKeyReused). An item's own `idempotencyKey` is used instead of the header's for that item. Needs post:schedule and channel:read, and media:read for the items that show media; an OAuth client needs the scope workspace:publish.
     *
     * Example:
     * ```php
     * $client->posts->bulk(
     *     'workspaceId',
     *     new BulkPosts([
     *         'posts' => [
     *             new BulkPost([
     *                 'channelIds' => [
     *                     'channelIds',
     *                 ],
     *                 'content' => new PostContent([
     *                     'media' => [
     *                         new MediaAttachment([
     *                             'altText' => 'altText',
     *                             'mediaId' => 'mediaId',
     *                         ]),
     *                     ],
     *                     'overrides' => [
     *                         new TextOverride([
     *                             'channelId' => 'channelId',
     *                             'text' => 'text',
     *                         ]),
     *                     ],
     *                     'text' => 'text',
     *                 ]),
     *                 'when' => PostTiming::now(new PostTimingNow([])),
     *             ]),
     *         ],
     *     ]),
     * );
     * ```
     *
     * @param string $workspaceId
     * @param BulkPosts $request
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?BulkResult
     * @throws PealException
     * @throws PealApiException
     */
    public function bulk(string $workspaceId, BulkPosts $request, ?array $options = null): ?BulkResult
    {
        $options = array_merge($this->options, $options ?? []);
        $options['maxRetries'] = 0;
        $headers = [];
        if ($request->idempotencyKey != null) {
            $headers['idempotency-key'] = $request->idempotencyKey;
        }
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/workspaces/{$workspaceId}/posts/bulk",
                    method: HttpMethod::POST,
                    headers: $headers,
                    body: $request,
                ),
                $options,
            );
            $statusCode = $response->getStatusCode();
            if ($statusCode >= 200 && $statusCode < 400) {
                $json = $response->getBody()->getContents();
                if (empty($json)) {
                    return null;
                }
                return BulkResult::fromJson($json);
            }
        } catch (JsonException $e) {
            throw new PealException(message: "Failed to deserialize response: {$e->getMessage()}", previous: $e);
        } catch (ClientExceptionInterface $e) {
            throw new PealException(message: $e->getMessage(), previous: $e);
        }
        throw new PealApiException(
            message: 'API request failed',
            statusCode: $statusCode,
            body: $response->getBody()->getContents(),
        );
    }

    /**
     * Creates and sends the posts a CSV file lists, one per row, at most 100 rows under its first line, which names the columns, in any order: `text` and `channels` (channel ids separated by spaces, commas or semicolons) are required columns, `at` too (`now`, an instant with its offset such as 2026-11-20T09:00:00Z, or a local time without one such as 2026-11-20 10:00, read in the row's `time_zone`, an IANA zone, UTC if left out); `media` (ids of ready media of the workspace), `allow_duplicate` (`true` or `false`) and `idempotency_key` are optional. Cells follow RFC 4180, strictly: a cell with a comma, a quote or a line break is written between double quotes, a quote inside it doubled; a quote anywhere else is ImportUnreadable (`strayQuote`). Blank lines are no rows. The file is checked first, every row, as `validate` checks a post and as the file it is (a row an earlier row leaves no room for in its month, one that repeats an earlier row's content near its time, and one that carries an earlier row's key with another post are refused; a row with more or fewer cells than the first line names is unreadable, never guessed); unless every row is valid, nothing is made, and `rows` says which are `valid`, `refused` (with what `send` would have answered) or `unreadable` (with the cells at fault). `dryRun` stops there even when every row is valid. Otherwise the rows are then made in order as `bulk` makes its items, each `created` or, when something changed since the check or a row repeats an earlier one, `refused`. The answer is 200 once the file was read; a file that cannot be read at all is ImportUnreadable. An `Idempotency-Key` header works as on `bulk`, by row. Needs post:schedule, post:read and channel:read, and media:read for rows with media; an OAuth client needs the scope workspace:publish.
     *
     * Example:
     * ```php
     * $client->posts->import(
     *     'workspaceId',
     *     new PostImport([
     *         'csv' => 'csv',
     *     ]),
     * );
     * ```
     *
     * @param string $workspaceId
     * @param PostImport $request
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?ImportResult
     * @throws PealException
     * @throws PealApiException
     */
    public function import(string $workspaceId, PostImport $request, ?array $options = null): ?ImportResult
    {
        $options = array_merge($this->options, $options ?? []);
        $options['maxRetries'] = 0;
        $headers = [];
        if ($request->idempotencyKey != null) {
            $headers['idempotency-key'] = $request->idempotencyKey;
        }
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/workspaces/{$workspaceId}/posts/import",
                    method: HttpMethod::POST,
                    headers: $headers,
                    body: $request,
                ),
                $options,
            );
            $statusCode = $response->getStatusCode();
            if ($statusCode >= 200 && $statusCode < 400) {
                $json = $response->getBody()->getContents();
                if (empty($json)) {
                    return null;
                }
                return ImportResult::fromJson($json);
            }
        } catch (JsonException $e) {
            throw new PealException(message: "Failed to deserialize response: {$e->getMessage()}", previous: $e);
        } catch (ClientExceptionInterface $e) {
            throw new PealException(message: $e->getMessage(), previous: $e);
        }
        throw new PealApiException(
            message: 'API request failed',
            statusCode: $statusCode,
            body: $response->getBody()->getContents(),
        );
    }

    /**
     * Checks a post without making it, and changes nothing: send what `send` takes, or a draft (no `when`). It answers 200 whether or not the post would go through, with `valid` and everything that would refuse it, all at once: per channel, the text the channel receives, counted as its platform counts it against each of its limits, its hashtags, mentions, links and media, and every violation of the platform's rules (text, media formats, sizes, counts and durations, options) and of the account's own where its platform tells them; the channels and media that are not the workspace's; and, when `when` is given, whether the time can be kept (for `queue`, the slot it would take now, `queueSlot`, or why there is none, `queueNoRoom`: QueueNotFound when the queue is not the workspace's), whether the workspace's plan has room, and the channels that already have the same content from another post (`duplicates`, as DuplicatePost tells them; none with `allowDuplicate`). A post that is valid now can still be refused later: a channel disconnected, a plan's month filled meanwhile. Needs post:read and channel:read, and media:read when it shows media.
     *
     * Example:
     * ```php
     * $client->posts->validate(
     *     'workspaceId',
     *     new PostToValidate([
     *         'channelIds' => [
     *             'channelIds',
     *         ],
     *         'content' => new PostContent([
     *             'media' => [
     *                 new MediaAttachment([
     *                     'altText' => 'altText',
     *                     'mediaId' => 'mediaId',
     *                 ]),
     *             ],
     *             'overrides' => [
     *                 new TextOverride([
     *                     'channelId' => 'channelId',
     *                     'text' => 'text',
     *                 ]),
     *             ],
     *             'text' => 'text',
     *         ]),
     *     ]),
     * );
     * ```
     *
     * @param string $workspaceId
     * @param PostToValidate $request
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?PostValidation
     * @throws PealException
     * @throws PealApiException
     */
    public function validate(string $workspaceId, PostToValidate $request, ?array $options = null): ?PostValidation
    {
        $options = array_merge($this->options, $options ?? []);
        $options['maxRetries'] = 0;
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/workspaces/{$workspaceId}/posts/validate",
                    method: HttpMethod::POST,
                    body: $request,
                ),
                $options,
            );
            $statusCode = $response->getStatusCode();
            if ($statusCode >= 200 && $statusCode < 400) {
                $json = $response->getBody()->getContents();
                if (empty($json)) {
                    return null;
                }
                return PostValidation::fromJson($json);
            }
        } catch (JsonException $e) {
            throw new PealException(message: "Failed to deserialize response: {$e->getMessage()}", previous: $e);
        } catch (ClientExceptionInterface $e) {
            throw new PealException(message: $e->getMessage(), previous: $e);
        }
        throw new PealApiException(
            message: 'API request failed',
            statusCode: $statusCode,
            body: $response->getBody()->getContents(),
        );
    }

    /**
     * Answers with a post of the workspace. Needs post:read.
     *
     * Example:
     * ```php
     * $client->posts->get(
     *     'workspaceId',
     *     'postId',
     * );
     * ```
     *
     * @param string $workspaceId
     * @param string $postId
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?Post
     * @throws PealException
     * @throws PealApiException
     */
    public function get(string $workspaceId, string $postId, ?array $options = null): ?Post
    {
        $options = array_merge($this->options, $options ?? []);
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/workspaces/{$workspaceId}/posts/{$postId}",
                    method: HttpMethod::GET,
                ),
                $options,
            );
            $statusCode = $response->getStatusCode();
            if ($statusCode >= 200 && $statusCode < 400) {
                $json = $response->getBody()->getContents();
                if (empty($json)) {
                    return null;
                }
                return Post::fromJson($json);
            }
        } catch (JsonException $e) {
            throw new PealException(message: "Failed to deserialize response: {$e->getMessage()}", previous: $e);
        } catch (ClientExceptionInterface $e) {
            throw new PealException(message: $e->getMessage(), previous: $e);
        }
        throw new PealApiException(
            message: 'API request failed',
            statusCode: $statusCode,
            body: $response->getBody()->getContents(),
        );
    }

    /**
     * Replaces a draft's content, channels and options: options left out are removed. Its tags are replaced by `tagIds` when given, and kept otherwise. A post that is no longer a draft is a conflict. Needs post:update, channel:read, and media:read when it shows media.
     *
     * Example:
     * ```php
     * $client->posts->update(
     *     'workspaceId',
     *     'postId',
     *     new UpdatePostsRequest([
     *         'body' => new PostDraft([
     *             'channelIds' => [
     *                 'channelIds',
     *             ],
     *             'content' => new PostContent([
     *                 'media' => [
     *                     new MediaAttachment([
     *                         'altText' => 'altText',
     *                         'mediaId' => 'mediaId',
     *                     ]),
     *                 ],
     *                 'overrides' => [
     *                     new TextOverride([
     *                         'channelId' => 'channelId',
     *                         'text' => 'text',
     *                     ]),
     *                 ],
     *                 'text' => 'text',
     *             ]),
     *         ]),
     *     ]),
     * );
     * ```
     *
     * @param string $workspaceId
     * @param string $postId
     * @param UpdatePostsRequest $request
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?Post
     * @throws PealException
     * @throws PealApiException
     */
    public function update(string $workspaceId, string $postId, UpdatePostsRequest $request, ?array $options = null): ?Post
    {
        $options = array_merge($this->options, $options ?? []);
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/workspaces/{$workspaceId}/posts/{$postId}",
                    method: HttpMethod::PUT,
                    body: $request->body,
                ),
                $options,
            );
            $statusCode = $response->getStatusCode();
            if ($statusCode >= 200 && $statusCode < 400) {
                $json = $response->getBody()->getContents();
                if (empty($json)) {
                    return null;
                }
                return Post::fromJson($json);
            }
        } catch (JsonException $e) {
            throw new PealException(message: "Failed to deserialize response: {$e->getMessage()}", previous: $e);
        } catch (ClientExceptionInterface $e) {
            throw new PealException(message: $e->getMessage(), previous: $e);
        }
        throw new PealApiException(
            message: 'API request failed',
            statusCode: $statusCode,
            body: $response->getBody()->getContents(),
        );
    }

    /**
     * Deletes a draft. A post scheduled or sent is a conflict: cancel it instead. Needs post:delete, or post:update for the user who created the draft.
     *
     * Example:
     * ```php
     * $client->posts->discard(
     *     'workspaceId',
     *     'postId',
     * );
     * ```
     *
     * @param string $workspaceId
     * @param string $postId
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @throws PealException
     * @throws PealApiException
     */
    public function discard(string $workspaceId, string $postId, ?array $options = null): void
    {
        $options = array_merge($this->options, $options ?? []);
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/workspaces/{$workspaceId}/posts/{$postId}",
                    method: HttpMethod::DELETE,
                ),
                $options,
            );
            $statusCode = $response->getStatusCode();
            if ($statusCode >= 200 && $statusCode < 400) {
                return;
            }
        } catch (ClientExceptionInterface $e) {
            throw new PealException(message: $e->getMessage(), previous: $e);
        }
        throw new PealApiException(
            message: 'API request failed',
            statusCode: $statusCode,
            body: $response->getBody()->getContents(),
        );
    }

    /**
     * Answers with a post once it has gone out: it waits up to `wait` seconds (60 at most; none unless given) until every channel has its result, and answers the post then (`status` `finished`), or as it stands when the time runs out, which a client asks again. A draft, a cancelled post and a post scheduled for later than the wait are answered at once. Waiting changes nothing and holds nothing: the post publishes in its own job either way. Needs post:read.
     *
     * Example:
     * ```php
     * $client->posts->outcome(
     *     'workspaceId',
     *     'postId',
     *     new OutcomePostsRequest([]),
     * );
     * ```
     *
     * @param string $workspaceId
     * @param string $postId
     * @param OutcomePostsRequest $request
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?Post
     * @throws PealException
     * @throws PealApiException
     */
    public function outcome(string $workspaceId, string $postId, OutcomePostsRequest $request = new OutcomePostsRequest(), ?array $options = null): ?Post
    {
        $options = array_merge($this->options, $options ?? []);
        $query = [];
        if ($request->wait != null) {
            $query['wait'] = $request->wait;
        }
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/workspaces/{$workspaceId}/posts/{$postId}/outcome",
                    method: HttpMethod::GET,
                    query: $query,
                ),
                $options,
            );
            $statusCode = $response->getStatusCode();
            if ($statusCode >= 200 && $statusCode < 400) {
                $json = $response->getBody()->getContents();
                if (empty($json)) {
                    return null;
                }
                return Post::fromJson($json);
            }
        } catch (JsonException $e) {
            throw new PealException(message: "Failed to deserialize response: {$e->getMessage()}", previous: $e);
        } catch (ClientExceptionInterface $e) {
            throw new PealException(message: $e->getMessage(), previous: $e);
        }
        throw new PealApiException(
            message: 'API request failed',
            statusCode: $statusCode,
            body: $response->getBody()->getContents(),
        );
    }

    /**
     * Lists every attempt Peal made at publishing the post, by channel, round and attempt, with how each ended. An attempt still in progress is not listed yet. Needs post:read.
     *
     * Example:
     * ```php
     * $client->posts->attempts(
     *     'workspaceId',
     *     'postId',
     * );
     * ```
     *
     * @param string $workspaceId
     * @param string $postId
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?array<PublicationAttempt>
     * @throws PealException
     * @throws PealApiException
     */
    public function attempts(string $workspaceId, string $postId, ?array $options = null): ?array
    {
        $options = array_merge($this->options, $options ?? []);
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/workspaces/{$workspaceId}/posts/{$postId}/attempts",
                    method: HttpMethod::GET,
                ),
                $options,
            );
            $statusCode = $response->getStatusCode();
            if ($statusCode >= 200 && $statusCode < 400) {
                $json = $response->getBody()->getContents();
                if (empty($json)) {
                    return null;
                }
                return JsonDecoder::decodeArray($json, [PublicationAttempt::class]); // @phpstan-ignore-line
            }
        } catch (JsonException $e) {
            throw new PealException(message: "Failed to deserialize response: {$e->getMessage()}", previous: $e);
        } catch (ClientExceptionInterface $e) {
            throw new PealException(message: $e->getMessage(), previous: $e);
        }
        throw new PealApiException(
            message: 'API request failed',
            statusCode: $statusCode,
            body: $response->getBody()->getContents(),
        );
    }

    /**
     * Files a post under these tags of the workspace, 10 at most, instead of those it had; an empty list takes them all off. Tags say nothing to the platforms, so a post takes them whatever its status, sent or not. Needs post:update.
     *
     * Example:
     * ```php
     * $client->posts->tag(
     *     'workspaceId',
     *     'postId',
     *     new PostTags([
     *         'tagIds' => [
     *             'tagIds',
     *         ],
     *     ]),
     * );
     * ```
     *
     * @param string $workspaceId
     * @param string $postId
     * @param PostTags $request
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?Post
     * @throws PealException
     * @throws PealApiException
     */
    public function tag(string $workspaceId, string $postId, PostTags $request, ?array $options = null): ?Post
    {
        $options = array_merge($this->options, $options ?? []);
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/workspaces/{$workspaceId}/posts/{$postId}/tags",
                    method: HttpMethod::PUT,
                    body: $request,
                ),
                $options,
            );
            $statusCode = $response->getStatusCode();
            if ($statusCode >= 200 && $statusCode < 400) {
                $json = $response->getBody()->getContents();
                if (empty($json)) {
                    return null;
                }
                return Post::fromJson($json);
            }
        } catch (JsonException $e) {
            throw new PealException(message: "Failed to deserialize response: {$e->getMessage()}", previous: $e);
        } catch (ClientExceptionInterface $e) {
            throw new PealException(message: $e->getMessage(), previous: $e);
        }
        throw new PealApiException(
            message: 'API request failed',
            statusCode: $statusCode,
            body: $response->getBody()->getContents(),
        );
    }

    /**
     * Makes a new draft that says what the post says, whatever the post's status: its text, its media, its channels with their text and options, and its tags. What the workspace no longer has is left out rather than refused: a channel disconnected since, with the text the post had there, media deleted since, a tag deleted since. The copy has no time, and its author is whoever asked; the post itself is not changed. Needs post:read and post:create, and channel:read.
     *
     * Example:
     * ```php
     * $client->posts->duplicate(
     *     'workspaceId',
     *     'postId',
     * );
     * ```
     *
     * @param string $workspaceId
     * @param string $postId
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?Post
     * @throws PealException
     * @throws PealApiException
     */
    public function duplicate(string $workspaceId, string $postId, ?array $options = null): ?Post
    {
        $options = array_merge($this->options, $options ?? []);
        $options['maxRetries'] = 0;
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/workspaces/{$workspaceId}/posts/{$postId}/duplicate",
                    method: HttpMethod::POST,
                ),
                $options,
            );
            $statusCode = $response->getStatusCode();
            if ($statusCode >= 200 && $statusCode < 400) {
                $json = $response->getBody()->getContents();
                if (empty($json)) {
                    return null;
                }
                return Post::fromJson($json);
            }
        } catch (JsonException $e) {
            throw new PealException(message: "Failed to deserialize response: {$e->getMessage()}", previous: $e);
        } catch (ClientExceptionInterface $e) {
            throw new PealException(message: $e->getMessage(), previous: $e);
        }
        throw new PealApiException(
            message: 'API request failed',
            statusCode: $statusCode,
            body: $response->getBody()->getContents(),
        );
    }

    /**
     * Schedules a draft on some of the workspace's channels at an instant, kept with the IANA time zone it was chosen in. The content must fit each platform's rules, its media included: file types, sizes, durations, dimensions, alt text, how many videos, and whether images and videos go together. A channel whose platform takes options needs those it requires, as the draft gives them on that channel: a channel the draft was not for has none yet. A time up to a minute ago publishes now. On a server that bills, the posts going out in that month (UTC) must fit the workspace's plan (PlanLimitReached). Where the workspace asks for an approval of this post (its approval policy), the post is not scheduled: it answers with the status `awaitingApproval`, keeps its time, and goes out only once approved; contributors may then ask too, with post:create. Needs post:schedule and channel:read, and media:read when it shows media.
     *
     * Example:
     * ```php
     * $client->posts->schedule(
     *     'workspaceId',
     *     'postId',
     *     new SchedulePost([
     *         'at' => 'at',
     *         'channelIds' => [
     *             'channelIds',
     *         ],
     *         'timeZone' => 'timeZone',
     *     ]),
     * );
     * ```
     *
     * @param string $workspaceId
     * @param string $postId
     * @param SchedulePost $request
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?Post
     * @throws PealException
     * @throws PealApiException
     */
    public function schedule(string $workspaceId, string $postId, SchedulePost $request, ?array $options = null): ?Post
    {
        $options = array_merge($this->options, $options ?? []);
        $options['maxRetries'] = 0;
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/workspaces/{$workspaceId}/posts/{$postId}/schedule",
                    method: HttpMethod::POST,
                    body: $request,
                ),
                $options,
            );
            $statusCode = $response->getStatusCode();
            if ($statusCode >= 200 && $statusCode < 400) {
                $json = $response->getBody()->getContents();
                if (empty($json)) {
                    return null;
                }
                return Post::fromJson($json);
            }
        } catch (JsonException $e) {
            throw new PealException(message: "Failed to deserialize response: {$e->getMessage()}", previous: $e);
        } catch (ClientExceptionInterface $e) {
            throw new PealException(message: $e->getMessage(), previous: $e);
        }
        throw new PealApiException(
            message: 'API request failed',
            statusCode: $statusCode,
            body: $response->getBody()->getContents(),
        );
    }

    /**
     * Moves a scheduled post, or one awaiting approval, to another instant, or schedules a draft on the channels it has. A post that needs an approval it does not have waits for it (`awaitingApproval`). Moved to another month, or scheduled, it must fit that month's posts in the workspace's plan (PlanLimitReached). Needs post:schedule, and channel:read for a draft.
     *
     * Example:
     * ```php
     * $client->posts->reschedule(
     *     'workspaceId',
     *     'postId',
     *     new ReschedulePostsRequest([
     *         'body' => new PostSchedule([
     *             'at' => 'at',
     *             'timeZone' => 'timeZone',
     *         ]),
     *     ]),
     * );
     * ```
     *
     * @param string $workspaceId
     * @param string $postId
     * @param ReschedulePostsRequest $request
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?Post
     * @throws PealException
     * @throws PealApiException
     */
    public function reschedule(string $workspaceId, string $postId, ReschedulePostsRequest $request, ?array $options = null): ?Post
    {
        $options = array_merge($this->options, $options ?? []);
        $options['maxRetries'] = 0;
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/workspaces/{$workspaceId}/posts/{$postId}/reschedule",
                    method: HttpMethod::POST,
                    body: $request->body,
                ),
                $options,
            );
            $statusCode = $response->getStatusCode();
            if ($statusCode >= 200 && $statusCode < 400) {
                $json = $response->getBody()->getContents();
                if (empty($json)) {
                    return null;
                }
                return Post::fromJson($json);
            }
        } catch (JsonException $e) {
            throw new PealException(message: "Failed to deserialize response: {$e->getMessage()}", previous: $e);
        } catch (ClientExceptionInterface $e) {
            throw new PealException(message: $e->getMessage(), previous: $e);
        }
        throw new PealApiException(
            message: 'API request failed',
            statusCode: $statusCode,
            body: $response->getBody()->getContents(),
        );
    }

    /**
     * Puts a post on the next free slot of a queue (`queueId`, or the workspace's default queue), decided when the request is received so that posts added together never take the same slot. A draft is scheduled there as `schedule` schedules it, on `channelIds` when given, on the channels it has otherwise, or, when it has none, where the same content sent with `when: queue` would go: the queue's connected channels and its channel set's, with the options the set keeps and the channels' default options; a channel of either that is no longer connected is left out and told in `warnings` (`queueChannelsDropped`, `channelsDropped`), and none left is UnknownChannels; a scheduled post, or one awaiting approval, is moved there as `reschedule` moves it, on the channels it has. Every rule of scheduling applies at that time, the approval gate and the plan's room in the slot's month included (PlanLimitReached, never a later month). A queue without a free slot within 366 days is QueueHasNoRoom, and nothing is changed. Needs post:schedule and channel:read.
     *
     * Example:
     * ```php
     * $client->posts->enqueue(
     *     'workspaceId',
     *     'postId',
     *     new QueuePost([]),
     * );
     * ```
     *
     * @param string $workspaceId
     * @param string $postId
     * @param QueuePost $request
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?Post
     * @throws PealException
     * @throws PealApiException
     */
    public function enqueue(string $workspaceId, string $postId, QueuePost $request = new QueuePost(), ?array $options = null): ?Post
    {
        $options = array_merge($this->options, $options ?? []);
        $options['maxRetries'] = 0;
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/workspaces/{$workspaceId}/posts/{$postId}/queue",
                    method: HttpMethod::POST,
                    body: $request,
                ),
                $options,
            );
            $statusCode = $response->getStatusCode();
            if ($statusCode >= 200 && $statusCode < 400) {
                $json = $response->getBody()->getContents();
                if (empty($json)) {
                    return null;
                }
                return Post::fromJson($json);
            }
        } catch (JsonException $e) {
            throw new PealException(message: "Failed to deserialize response: {$e->getMessage()}", previous: $e);
        } catch (ClientExceptionInterface $e) {
            throw new PealException(message: $e->getMessage(), previous: $e);
        }
        throw new PealApiException(
            message: 'API request failed',
            statusCode: $statusCode,
            body: $response->getBody()->getContents(),
        );
    }

    /**
     * Takes a scheduled post back to draft, so its text and media can change: it goes out at no time until it is scheduled again. A post already publishing is a conflict. Needs post:schedule.
     *
     * Example:
     * ```php
     * $client->posts->unschedule(
     *     'workspaceId',
     *     'postId',
     * );
     * ```
     *
     * @param string $workspaceId
     * @param string $postId
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?Post
     * @throws PealException
     * @throws PealApiException
     */
    public function unschedule(string $workspaceId, string $postId, ?array $options = null): ?Post
    {
        $options = array_merge($this->options, $options ?? []);
        $options['maxRetries'] = 0;
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/workspaces/{$workspaceId}/posts/{$postId}/unschedule",
                    method: HttpMethod::POST,
                ),
                $options,
            );
            $statusCode = $response->getStatusCode();
            if ($statusCode >= 200 && $statusCode < 400) {
                $json = $response->getBody()->getContents();
                if (empty($json)) {
                    return null;
                }
                return Post::fromJson($json);
            }
        } catch (JsonException $e) {
            throw new PealException(message: "Failed to deserialize response: {$e->getMessage()}", previous: $e);
        } catch (ClientExceptionInterface $e) {
            throw new PealException(message: $e->getMessage(), previous: $e);
        }
        throw new PealApiException(
            message: 'API request failed',
            statusCode: $statusCode,
            body: $response->getBody()->getContents(),
        );
    }

    /**
     * Sends the post again, now, on one channel where it failed or is unconfirmed: a new round, with its own attempts. Check the platform first when it is unconfirmed, as it may be live already. A post of several parts goes on from the part after the last that is live; one failed as `partsNotSent` is refused (TargetStatusConflict), as Peal has no post to send the rest under: a part found by hand has no id, or the part to reply to is gone. Needs post:schedule.
     *
     * Example:
     * ```php
     * $client->posts->repost(
     *     'workspaceId',
     *     'postId',
     *     'targetId',
     * );
     * ```
     *
     * @param string $workspaceId
     * @param string $postId
     * @param string $targetId
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?Post
     * @throws PealException
     * @throws PealApiException
     */
    public function repost(string $workspaceId, string $postId, string $targetId, ?array $options = null): ?Post
    {
        $options = array_merge($this->options, $options ?? []);
        $options['maxRetries'] = 0;
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/workspaces/{$workspaceId}/posts/{$postId}/targets/{$targetId}/repost",
                    method: HttpMethod::POST,
                ),
                $options,
            );
            $statusCode = $response->getStatusCode();
            if ($statusCode >= 200 && $statusCode < 400) {
                $json = $response->getBody()->getContents();
                if (empty($json)) {
                    return null;
                }
                return Post::fromJson($json);
            }
        } catch (JsonException $e) {
            throw new PealException(message: "Failed to deserialize response: {$e->getMessage()}", previous: $e);
        } catch (ClientExceptionInterface $e) {
            throw new PealException(message: $e->getMessage(), previous: $e);
        }
        throw new PealApiException(
            message: 'API request failed',
            statusCode: $statusCode,
            body: $response->getBody()->getContents(),
        );
    }

    /**
     * Says what you found on the platform for a post unconfirmed on one channel: `published`, with its address if you have it, or `notPublished`, which fails it there so it can be reposted. Its notifications are marked read. Needs post:schedule.
     *
     * Example:
     * ```php
     * $client->posts->confirm(
     *     'workspaceId',
     *     'postId',
     *     'targetId',
     *     new ConfirmPostsRequest([
     *         'body' => TargetConfirmation::published(new TargetConfirmationPublished([
     *             'permalink' => null,
     *         ])),
     *     ]),
     * );
     * ```
     *
     * @param string $workspaceId
     * @param string $postId
     * @param string $targetId
     * @param ConfirmPostsRequest $request
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?Post
     * @throws PealException
     * @throws PealApiException
     */
    public function confirm(string $workspaceId, string $postId, string $targetId, ConfirmPostsRequest $request, ?array $options = null): ?Post
    {
        $options = array_merge($this->options, $options ?? []);
        $options['maxRetries'] = 0;
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/workspaces/{$workspaceId}/posts/{$postId}/targets/{$targetId}/confirm",
                    method: HttpMethod::POST,
                    body: $request->body,
                ),
                $options,
            );
            $statusCode = $response->getStatusCode();
            if ($statusCode >= 200 && $statusCode < 400) {
                $json = $response->getBody()->getContents();
                if (empty($json)) {
                    return null;
                }
                return Post::fromJson($json);
            }
        } catch (JsonException $e) {
            throw new PealException(message: "Failed to deserialize response: {$e->getMessage()}", previous: $e);
        } catch (ClientExceptionInterface $e) {
            throw new PealException(message: $e->getMessage(), previous: $e);
        }
        throw new PealApiException(
            message: 'API request failed',
            statusCode: $statusCode,
            body: $response->getBody()->getContents(),
        );
    }

    /**
     * Deletes the post from one channel's platform, for everyone: every part of a thread, the last first, so a deletion that stops midway leaves a shorter thread that still reads from its start. It cannot be undone from Peal. The request is accepted (202) and a job deletes it, one call at a time with the channel's other calls; a part the platform no longer has counts as deleted (`alreadyGone`), and a call that fails is tried again (as long as the platform asks to wait, and five more times while it cannot be reached), after which the change is `failed` with its `code` and asking again deletes the parts left. `wait` waits up to that many seconds (60 at most) for the change to end, and answers it as it then stands. Once done, the target keeps the status `published` with its `removedAt` (the month's count and the usage stay, as the post did go out), analytics stops reading it and keeps what it read, and the inbox stops reading its comments and keeps those it has. Refused (LivePostNotChangeable) before anything is called where it is not live there, was deleted already, Peal has no id for a part of it, the platform does not let Peal delete it (the capabilities' `livePost` say so beforehand), another change of it is pending, the channel cannot be used, or a boost that is not over shows it. Webhooks hear `post.unpublished` or `post.unpublish_failed`. Needs post:publish; an OAuth client needs the scope workspace:publish.
     *
     * Example:
     * ```php
     * $client->posts->unpublishTarget(
     *     'workspaceId',
     *     'postId',
     *     'targetId',
     *     new UnpublishTargetPostsRequest([]),
     * );
     * ```
     *
     * @param string $workspaceId
     * @param string $postId
     * @param string $targetId
     * @param UnpublishTargetPostsRequest $request
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?LivePostChange
     * @throws PealException
     * @throws PealApiException
     */
    public function unpublishTarget(string $workspaceId, string $postId, string $targetId, UnpublishTargetPostsRequest $request = new UnpublishTargetPostsRequest(), ?array $options = null): ?LivePostChange
    {
        $options = array_merge($this->options, $options ?? []);
        $options['maxRetries'] = 0;
        $query = [];
        if ($request->wait != null) {
            $query['wait'] = $request->wait;
        }
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/workspaces/{$workspaceId}/posts/{$postId}/targets/{$targetId}/unpublish",
                    method: HttpMethod::POST,
                    query: $query,
                ),
                $options,
            );
            $statusCode = $response->getStatusCode();
            if ($statusCode >= 200 && $statusCode < 400) {
                $json = $response->getBody()->getContents();
                if (empty($json)) {
                    return null;
                }
                return LivePostChange::fromJson($json);
            }
        } catch (JsonException $e) {
            throw new PealException(message: "Failed to deserialize response: {$e->getMessage()}", previous: $e);
        } catch (ClientExceptionInterface $e) {
            throw new PealException(message: $e->getMessage(), previous: $e);
        }
        throw new PealApiException(
            message: 'API request failed',
            statusCode: $statusCode,
            body: $response->getBody()->getContents(),
        );
    }

    /**
     * Deletes the post from every channel's platform where it can be, as unpublishing it on each channel does, and answers the change made on each (`changes`) and, beside them, why it could not be on the others (`refused`, each with the target and the reason LivePostNotChangeable gives): one channel that cannot never fails the whole request. It cannot be undone from Peal. Needs post:publish; an OAuth client needs the scope workspace:publish.
     *
     * Example:
     * ```php
     * $client->posts->unpublish(
     *     'workspaceId',
     *     'postId',
     * );
     * ```
     *
     * @param string $workspaceId
     * @param string $postId
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?PostUnpublish
     * @throws PealException
     * @throws PealApiException
     */
    public function unpublish(string $workspaceId, string $postId, ?array $options = null): ?PostUnpublish
    {
        $options = array_merge($this->options, $options ?? []);
        $options['maxRetries'] = 0;
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/workspaces/{$workspaceId}/posts/{$postId}/unpublish",
                    method: HttpMethod::POST,
                ),
                $options,
            );
            $statusCode = $response->getStatusCode();
            if ($statusCode >= 200 && $statusCode < 400) {
                $json = $response->getBody()->getContents();
                if (empty($json)) {
                    return null;
                }
                return PostUnpublish::fromJson($json);
            }
        } catch (JsonException $e) {
            throw new PealException(message: "Failed to deserialize response: {$e->getMessage()}", previous: $e);
        } catch (ClientExceptionInterface $e) {
            throw new PealException(message: $e->getMessage(), previous: $e);
        }
        throw new PealApiException(
            message: 'API request failed',
            statusCode: $statusCode,
            body: $response->getBody()->getContents(),
        );
    }

    /**
     * Lists the changes asked of the post once it was live (deleting it from a channel's platform), newest first, each with where it stands: `pending`, `done` or `failed` with its `code`. Needs post:read.
     *
     * Example:
     * ```php
     * $client->posts->changes(
     *     'workspaceId',
     *     'postId',
     * );
     * ```
     *
     * @param string $workspaceId
     * @param string $postId
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?LivePostChanges
     * @throws PealException
     * @throws PealApiException
     */
    public function changes(string $workspaceId, string $postId, ?array $options = null): ?LivePostChanges
    {
        $options = array_merge($this->options, $options ?? []);
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/workspaces/{$workspaceId}/posts/{$postId}/changes",
                    method: HttpMethod::GET,
                ),
                $options,
            );
            $statusCode = $response->getStatusCode();
            if ($statusCode >= 200 && $statusCode < 400) {
                $json = $response->getBody()->getContents();
                if (empty($json)) {
                    return null;
                }
                return LivePostChanges::fromJson($json);
            }
        } catch (JsonException $e) {
            throw new PealException(message: "Failed to deserialize response: {$e->getMessage()}", previous: $e);
        } catch (ClientExceptionInterface $e) {
            throw new PealException(message: $e->getMessage(), previous: $e);
        }
        throw new PealApiException(
            message: 'API request failed',
            statusCode: $statusCode,
            body: $response->getBody()->getContents(),
        );
    }

    /**
     * Cancels a draft, a scheduled post or one awaiting approval. A post already publishing finishes with what its channels did: those not yet sent are cancelled. Needs post:schedule.
     *
     * Example:
     * ```php
     * $client->posts->cancel(
     *     'workspaceId',
     *     'postId',
     * );
     * ```
     *
     * @param string $workspaceId
     * @param string $postId
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?Post
     * @throws PealException
     * @throws PealApiException
     */
    public function cancel(string $workspaceId, string $postId, ?array $options = null): ?Post
    {
        $options = array_merge($this->options, $options ?? []);
        $options['maxRetries'] = 0;
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/workspaces/{$workspaceId}/posts/{$postId}/cancel",
                    method: HttpMethod::POST,
                ),
                $options,
            );
            $statusCode = $response->getStatusCode();
            if ($statusCode >= 200 && $statusCode < 400) {
                $json = $response->getBody()->getContents();
                if (empty($json)) {
                    return null;
                }
                return Post::fromJson($json);
            }
        } catch (JsonException $e) {
            throw new PealException(message: "Failed to deserialize response: {$e->getMessage()}", previous: $e);
        } catch (ClientExceptionInterface $e) {
            throw new PealException(message: $e->getMessage(), previous: $e);
        }
        throw new PealApiException(
            message: 'API request failed',
            statusCode: $statusCode,
            body: $response->getBody()->getContents(),
        );
    }
}
