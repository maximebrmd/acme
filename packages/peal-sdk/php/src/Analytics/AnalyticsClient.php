<?php

namespace Peal\Analytics;

use Psr\Http\Client\ClientInterface;
use Peal\Core\Client\RawClient;
use Peal\Analytics\Requests\SummaryAnalyticsRequest;
use Peal\Types\AnalyticsSummary;
use Peal\Exceptions\PealException;
use Peal\Exceptions\PealApiException;
use Peal\Core\Json\JsonApiRequest;
use Peal\Environments;
use Peal\Core\Client\HttpMethod;
use JsonException;
use Psr\Http\Client\ClientExceptionInterface;
use Peal\Analytics\Requests\DashboardAnalyticsRequest;
use Peal\Types\AnalyticsDashboard;
use Peal\Analytics\Requests\ChannelAnalyticsRequest;
use Peal\Types\ChannelSeries;
use Peal\Analytics\Requests\ExportAnalyticsRequest;
use Peal\Types\PostAnalytics;

class AnalyticsClient
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
     * Sums up the posts published from `from` to `to`, both included and at most 366 days, as days run in `timeZone` (an IANA zone such as Europe/Paris): their latest counts in all and by channel, what they gained each day, and the five with the most engagement (likes, reposts, replies and quotes). Counts are read from the platforms every hour for 48 hours after a post goes live, then every day until it is 30 days old. Needs analytics:read.
     *
     * Example:
     * ```php
     * $client->analytics->summary(
     *     'workspaceId',
     *     new SummaryAnalyticsRequest([
     *         'from' => 'from',
     *         'timeZone' => 'timeZone',
     *         'to' => 'to',
     *     ]),
     * );
     * ```
     *
     * @param string $workspaceId
     * @param SummaryAnalyticsRequest $request
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?AnalyticsSummary
     * @throws PealException
     * @throws PealApiException
     */
    public function summary(string $workspaceId, SummaryAnalyticsRequest $request, ?array $options = null): ?AnalyticsSummary
    {
        $options = array_merge($this->options, $options ?? []);
        $query = [];
        $query['from'] = $request->from;
        $query['timeZone'] = $request->timeZone;
        $query['to'] = $request->to;
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/workspaces/{$workspaceId}/analytics/summary",
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
                return AnalyticsSummary::fromJson($json);
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
     * Answers a workspace's analytics over a range in one call: the totals of the posts published in it and of those published in the range before, of the same length, so a client shows the trend; followers at the end of each and their change; the same by channel and by platform; each day's gains, followers and account views; and the `topPosts` (5 unless said, 25 at most) with the most engagement. The range is `days` (7, 30 or 90: that many days ending today in `timeZone`), or `from` and `to`, both included and at most 366 days; `timeZone` is an IANA zone such as Europe/Paris. Followers are kept from the day a channel is connected, read once a day; a number a platform does not give is null, never zero. Needs analytics:read.
     *
     * Example:
     * ```php
     * $client->analytics->dashboard(
     *     'workspaceId',
     *     new DashboardAnalyticsRequest([
     *         'timeZone' => 'timeZone',
     *     ]),
     * );
     * ```
     *
     * @param string $workspaceId
     * @param DashboardAnalyticsRequest $request
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?AnalyticsDashboard
     * @throws PealException
     * @throws PealApiException
     */
    public function dashboard(string $workspaceId, DashboardAnalyticsRequest $request, ?array $options = null): ?AnalyticsDashboard
    {
        $options = array_merge($this->options, $options ?? []);
        $query = [];
        $query['timeZone'] = $request->timeZone;
        if ($request->days != null) {
            $query['days'] = $request->days;
        }
        if ($request->from != null) {
            $query['from'] = $request->from;
        }
        if ($request->to != null) {
            $query['to'] = $request->to;
        }
        if ($request->topPosts != null) {
            $query['topPosts'] = $request->topPosts;
        }
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/workspaces/{$workspaceId}/analytics/dashboard",
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
                return AnalyticsDashboard::fromJson($json);
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
     * Answers one channel's numbers day by day: its followers, the accounts it follows and its posts as read each UTC day, the views and reach its platform counted, and what its posts published in the range gained. The range is `days` (7, 30 or 90: that many days ending today in `timeZone`), or `from` and `to`, both included and at most 366 days; `timeZone` is an IANA zone such as Europe/Paris. A channel Peal has read nothing of answers days without numbers. Needs analytics:read.
     *
     * Example:
     * ```php
     * $client->analytics->channel(
     *     'workspaceId',
     *     'channelId',
     *     new ChannelAnalyticsRequest([
     *         'timeZone' => 'timeZone',
     *     ]),
     * );
     * ```
     *
     * @param string $workspaceId
     * @param string $channelId
     * @param ChannelAnalyticsRequest $request
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?ChannelSeries
     * @throws PealException
     * @throws PealApiException
     */
    public function channel(string $workspaceId, string $channelId, ChannelAnalyticsRequest $request, ?array $options = null): ?ChannelSeries
    {
        $options = array_merge($this->options, $options ?? []);
        $query = [];
        $query['timeZone'] = $request->timeZone;
        if ($request->days != null) {
            $query['days'] = $request->days;
        }
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
                    path: "api/workspaces/{$workspaceId}/analytics/channels/{$channelId}",
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
                return ChannelSeries::fromJson($json);
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
     * Streams the workspace's analytics as a file: `kind=posts` lists each post published in the range on each channel with its latest counts, `kind=accounts` each channel's account day by day. `format=csv` (the default) writes a header line then one line a row, as RFC 4180; `format=json` writes one JSON object a line (`application/x-ndjson`). A number a platform does not give is empty in CSV and null in JSON. The range is `days` (7, 30 or 90: that many days ending today in `timeZone`), or `from` and `to`, both included and at most 366 days; `timeZone` is an IANA zone such as Europe/Paris. Needs analytics:read.
     *
     * Example:
     * ```php
     * $client->analytics->export(
     *     'workspaceId',
     *     new ExportAnalyticsRequest([
     *         'timeZone' => 'timeZone',
     *         'kind' => AnalyticsExportKind::Posts->value,
     *     ]),
     * );
     * ```
     *
     * @param string $workspaceId
     * @param ExportAnalyticsRequest $request
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return string
     * @throws PealException
     * @throws PealApiException
     */
    public function export(string $workspaceId, ExportAnalyticsRequest $request, ?array $options = null): string
    {
        $options = array_merge($this->options, $options ?? []);
        $query = [];
        $query['timeZone'] = $request->timeZone;
        $query['kind'] = $request->kind;
        if ($request->days != null) {
            $query['days'] = $request->days;
        }
        if ($request->from != null) {
            $query['from'] = $request->from;
        }
        if ($request->to != null) {
            $query['to'] = $request->to;
        }
        if ($request->format != null) {
            $query['format'] = $request->format;
        }
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/workspaces/{$workspaceId}/analytics/export",
                    method: HttpMethod::GET,
                    query: $query,
                ),
                $options,
            );
            $statusCode = $response->getStatusCode();
            if ($statusCode >= 200 && $statusCode < 400) {
                return $response->getBody()->getContents();
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
     * Answers with the counts of a post on each channel it went live on, over time. A post not published yet, or whose counts were not read yet, has no targets. Needs analytics:read.
     *
     * Example:
     * ```php
     * $client->analytics->post(
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
     * @return ?PostAnalytics
     * @throws PealException
     * @throws PealApiException
     */
    public function post(string $workspaceId, string $postId, ?array $options = null): ?PostAnalytics
    {
        $options = array_merge($this->options, $options ?? []);
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/workspaces/{$workspaceId}/analytics/posts/{$postId}",
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
                return PostAnalytics::fromJson($json);
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
