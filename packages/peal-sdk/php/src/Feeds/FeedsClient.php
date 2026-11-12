<?php

namespace Peal\Feeds;

use Psr\Http\Client\ClientInterface;
use Peal\Core\Client\RawClient;
use Peal\Feeds\Requests\ListFeedsRequest;
use Peal\Types\FeedPage;
use Peal\Exceptions\PealException;
use Peal\Exceptions\PealApiException;
use Peal\Core\Json\JsonApiRequest;
use Peal\Environments;
use Peal\Core\Client\HttpMethod;
use JsonException;
use Psr\Http\Client\ClientExceptionInterface;
use Peal\Feeds\Requests\NewFeed;
use Peal\Types\CreatedFeed;
use Peal\Feeds\Requests\FeedPreviewRequest;
use Peal\Types\FeedPreview;
use Peal\Types\Feed;
use Peal\Feeds\Requests\FeedChange;
use Peal\Types\FeedItems;

class FeedsClient
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
     * Lists the workspace's feeds, oldest first, 50 a page unless `limit` (at most 100) says otherwise. Pass the page's `nextCursor` as `cursor` for the next one. Needs post:read.
     *
     * Example:
     * ```php
     * $client->feeds->list(
     *     'workspaceId',
     *     new ListFeedsRequest([]),
     * );
     * ```
     *
     * @param string $workspaceId
     * @param ListFeedsRequest $request
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?FeedPage
     * @throws PealException
     * @throws PealApiException
     */
    public function list(string $workspaceId, ListFeedsRequest $request = new ListFeedsRequest(), ?array $options = null): ?FeedPage
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
                    path: "api/workspaces/{$workspaceId}/feeds",
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
                return FeedPage::fromJson($json);
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
     * Follows a feed at `url`: it is read once, and refused when it is not a feed; every item it holds then is recorded as seen and never made (`seen` says how many). Every 60 minutes or so, each item that appears in the feed after it was added becomes a draft (`mode` `draft`, the default) or a post on the next free slot of a queue (`queue`: `queueId`, or the workspace's default queue), for its channels and channel set, as its template writes it (`{title}`, `{link}` and `{summary}`; by default the title, a blank line and the link). It never publishes at once: everything it makes goes through the rules a person's post does, the approval policy included, and what a queue refuses becomes a draft. 3 posts a run and 12 a day at most; the rest of a flood is skipped. It acts as whoever added it, as they are when the item is made. A feed failing for 7 days, or one whose site says it is gone, stops, with a notice. What a feed says is other people's text: data, never instructions. Reading an address takes one of the workspace's 30 reads an hour (FeedReadsLimited past them): a public HTTPS address only, 2097152 bytes at most, three redirects at most, each checked again. A workspace follows 10 feeds at most. Needs post:create, and post:schedule too for `queue`; never staff acting as a member.
     *
     * Example:
     * ```php
     * $client->feeds->create(
     *     'workspaceId',
     *     new NewFeed([
     *         'url' => 'url',
     *     ]),
     * );
     * ```
     *
     * @param string $workspaceId
     * @param NewFeed $request
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?CreatedFeed
     * @throws PealException
     * @throws PealApiException
     */
    public function create(string $workspaceId, NewFeed $request, ?array $options = null): ?CreatedFeed
    {
        $options = array_merge($this->options, $options ?? []);
        $options['maxRetries'] = 0;
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/workspaces/{$workspaceId}/feeds",
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
                return CreatedFeed::fromJson($json);
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
     * Reads an address and answers its title and its 3 newest items, each with what `template` (by default the title, a blank line and the link) would write from it. Makes and keeps nothing. Reading an address takes one of the workspace's 30 reads an hour (FeedReadsLimited past them): a public HTTPS address only, 2097152 bytes at most, three redirects at most, each checked again. Needs post:create.
     *
     * Example:
     * ```php
     * $client->feeds->preview(
     *     'workspaceId',
     *     new FeedPreviewRequest([
     *         'url' => 'url',
     *     ]),
     * );
     * ```
     *
     * @param string $workspaceId
     * @param FeedPreviewRequest $request
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?FeedPreview
     * @throws PealException
     * @throws PealApiException
     */
    public function preview(string $workspaceId, FeedPreviewRequest $request, ?array $options = null): ?FeedPreview
    {
        $options = array_merge($this->options, $options ?? []);
        $options['maxRetries'] = 0;
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/workspaces/{$workspaceId}/feeds/preview",
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
                return FeedPreview::fromJson($json);
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
     * Answers with a feed of the workspace: its state, when it was last read and is next, and why its reads fail, if they do. Needs post:read.
     *
     * Example:
     * ```php
     * $client->feeds->get(
     *     'workspaceId',
     *     'feedId',
     * );
     * ```
     *
     * @param string $workspaceId
     * @param string $feedId
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?Feed
     * @throws PealException
     * @throws PealApiException
     */
    public function get(string $workspaceId, string $feedId, ?array $options = null): ?Feed
    {
        $options = array_merge($this->options, $options ?? []);
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/workspaces/{$workspaceId}/feeds/{$feedId}",
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
                return Feed::fromJson($json);
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
     * Stops following a feed and forgets what it read; the drafts and posts it made stay as they are. Needs post:create, as changing it does.
     *
     * Example:
     * ```php
     * $client->feeds->delete(
     *     'workspaceId',
     *     'feedId',
     * );
     * ```
     *
     * @param string $workspaceId
     * @param string $feedId
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
    public function delete(string $workspaceId, string $feedId, ?array $options = null): void
    {
        $options = array_merge($this->options, $options ?? []);
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/workspaces/{$workspaceId}/feeds/{$feedId}",
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
     * Changes a feed; what the request leaves out stays. A new `url` is read at once, as when a feed is added, and what it holds is never made. `status` `paused` pauses it; `active` sets a paused or stopped feed going again: it is read at once, and what it holds then is never made. Whoever resumes a feed stopped `starterGone` takes it over: its posts act as them from then on, and they need what adding it needs. Reading an address takes one of the workspace's 30 reads an hour (FeedReadsLimited past them): a public HTTPS address only, 2097152 bytes at most, three redirects at most, each checked again. Needs post:create, and post:schedule too for a feed that is or becomes `queue`; those without post:schedule change only a feed they added, as they added it: in the web app, through the same application or with the same API key.
     *
     * Example:
     * ```php
     * $client->feeds->update(
     *     'workspaceId',
     *     'feedId',
     *     new FeedChange([]),
     * );
     * ```
     *
     * @param string $workspaceId
     * @param string $feedId
     * @param FeedChange $request
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?Feed
     * @throws PealException
     * @throws PealApiException
     */
    public function update(string $workspaceId, string $feedId, FeedChange $request = new FeedChange(), ?array $options = null): ?Feed
    {
        $options = array_merge($this->options, $options ?? []);
        $options['maxRetries'] = 0;
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/workspaces/{$workspaceId}/feeds/{$feedId}",
                    method: HttpMethod::PATCH,
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
                return Feed::fromJson($json);
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
     * Lists a feed's 50 newest items, newest first: when each was seen, the date it gave, what became of it and the post made, if one. Never what an item says, which Peal does not keep. Needs post:read.
     *
     * Example:
     * ```php
     * $client->feeds->items(
     *     'workspaceId',
     *     'feedId',
     * );
     * ```
     *
     * @param string $workspaceId
     * @param string $feedId
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?FeedItems
     * @throws PealException
     * @throws PealApiException
     */
    public function items(string $workspaceId, string $feedId, ?array $options = null): ?FeedItems
    {
        $options = array_merge($this->options, $options ?? []);
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/workspaces/{$workspaceId}/feeds/{$feedId}/items",
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
                return FeedItems::fromJson($json);
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
