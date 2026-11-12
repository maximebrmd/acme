<?php

namespace Peal\ShortLinks;

use Psr\Http\Client\ClientInterface;
use Peal\Core\Client\RawClient;
use Peal\Types\ShortLinkStatus;
use Peal\Exceptions\PealException;
use Peal\Exceptions\PealApiException;
use Peal\Core\Json\JsonApiRequest;
use Peal\Environments;
use Peal\Core\Client\HttpMethod;
use JsonException;
use Psr\Http\Client\ClientExceptionInterface;
use Peal\ShortLinks\Requests\ShortLinkSettings;
use Peal\ShortLinks\Requests\ListShortLinksRequest;
use Peal\Types\ShortLinkPage;
use Peal\ShortLinks\Requests\GetShortLinksRequest;
use Peal\Types\ShortLinkReport;

class ShortLinksClient
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
     * Answers whether this server shortens links (`available`), what a short address starts with (`base`) and how long it is (`shortLength`), and whether the workspace's new posts ask for short links by default (`byDefault`). A post that asks (`shortenLinks`) goes out with each link written with `http://` or `https://` and longer than a short address replaced by one, one per channel and link, which redirects to it and counts the visit; the text kept stays as written, and Pinterest always gets links as written. Needs post:read.
     *
     * Example:
     * ```php
     * $client->shortLinks->status(
     *     'workspaceId',
     * );
     * ```
     *
     * @param string $workspaceId
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?ShortLinkStatus
     * @throws PealException
     * @throws PealApiException
     */
    public function status(string $workspaceId, ?array $options = null): ?ShortLinkStatus
    {
        $options = array_merge($this->options, $options ?? []);
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/workspaces/{$workspaceId}/short-links/status",
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
                return ShortLinkStatus::fromJson($json);
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
     * Sets whether the workspace's new posts ask for short links unless their author says otherwise; each post still chooses for itself. Needs organization:update, which owners and admins hold.
     *
     * Example:
     * ```php
     * $client->shortLinks->setDefault(
     *     'workspaceId',
     *     new ShortLinkSettings([
     *         'byDefault' => true,
     *     ]),
     * );
     * ```
     *
     * @param string $workspaceId
     * @param ShortLinkSettings $request
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?ShortLinkStatus
     * @throws PealException
     * @throws PealApiException
     */
    public function setDefault(string $workspaceId, ShortLinkSettings $request, ?array $options = null): ?ShortLinkStatus
    {
        $options = array_merge($this->options, $options ?? []);
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/workspaces/{$workspaceId}/short-links/settings",
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
                return ShortLinkStatus::fromJson($json);
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
     * Lists the workspace's short links, newest first, 50 a page unless `limit` (at most 100) says otherwise, those of one post (`postId`) or one channel (`channelId`), each with its clicks from `from` to `to` (UTC days, both included, at most 92; by default the 30 days that end today). Pass the page's `nextCursor` as `cursor` for the next one. Clicks are counted by UTC day and kept 400 days; a request from an automated reader (a crawler, a link preview), a prefetch or a HEAD is redirected but not counted, so the figure is approximate, and nothing about the visitor is kept. Needs analytics:read.
     *
     * Example:
     * ```php
     * $client->shortLinks->list(
     *     'workspaceId',
     *     new ListShortLinksRequest([]),
     * );
     * ```
     *
     * @param string $workspaceId
     * @param ListShortLinksRequest $request
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?ShortLinkPage
     * @throws PealException
     * @throws PealApiException
     */
    public function list(string $workspaceId, ListShortLinksRequest $request = new ListShortLinksRequest(), ?array $options = null): ?ShortLinkPage
    {
        $options = array_merge($this->options, $options ?? []);
        $query = [];
        if ($request->channelId != null) {
            $query['channelId'] = $request->channelId;
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
        if ($request->postId != null) {
            $query['postId'] = $request->postId;
        }
        if ($request->to != null) {
            $query['to'] = $request->to;
        }
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/workspaces/{$workspaceId}/short-links",
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
                return ShortLinkPage::fromJson($json);
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
     * Answers one short link with its clicks each day from `from` to `to` (UTC days, both included, at most 92; by default the 30 days that end today), oldest first. Clicks are counted by UTC day and kept 400 days; a request from an automated reader (a crawler, a link preview), a prefetch or a HEAD is redirected but not counted, so the figure is approximate, and nothing about the visitor is kept. Needs analytics:read.
     *
     * Example:
     * ```php
     * $client->shortLinks->get(
     *     'workspaceId',
     *     'linkId',
     *     new GetShortLinksRequest([]),
     * );
     * ```
     *
     * @param string $workspaceId
     * @param string $linkId
     * @param GetShortLinksRequest $request
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?ShortLinkReport
     * @throws PealException
     * @throws PealApiException
     */
    public function get(string $workspaceId, string $linkId, GetShortLinksRequest $request = new GetShortLinksRequest(), ?array $options = null): ?ShortLinkReport
    {
        $options = array_merge($this->options, $options ?? []);
        $query = [];
        if ($request->from != null) {
            $query['from'] = $request->from;
        }
        if ($request->to != null) {
            $query['to'] = $request->to;
        }
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/workspaces/{$workspaceId}/short-links/{$linkId}",
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
                return ShortLinkReport::fromJson($json);
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
