<?php

namespace Peal\Overview;

use Psr\Http\Client\ClientInterface;
use Peal\Core\Client\RawClient;
use Peal\Overview\Requests\GetOverviewRequest;
use Peal\Types\Overview;
use Peal\Exceptions\PealException;
use Peal\Exceptions\PealApiException;
use Peal\Core\Json\JsonApiRequest;
use Peal\Environments;
use Peal\Core\Client\HttpMethod;
use JsonException;
use Psr\Http\Client\ClientExceptionInterface;
use Peal\Overview\Requests\AgendaOverviewRequest;
use Peal\Types\AgendaPage;
use Peal\Overview\Requests\ReportOverviewRequest;
use Peal\Types\ReportAcrossWorkspaces;
use Peal\Overview\Requests\ReportExportOverviewRequest;

class OverviewClient
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
     * Answers what needs attention in each workspace the user belongs to, 50 a page at most, by name then id: the posts going out in the next 7 days, those waiting for an approval (and whether the user may approve them), those that finished in the last 7 days with a channel that failed or that must be checked; the channels connected, to reconnect and turned off; the inbox's threads waiting for an answer; and whether the workspace is over its plan. Each section is given only where the user's role in that workspace may read it, with the permission its own page takes (`post:read`, `channel:read`, `engagement:read`), and is null otherwise, never zero; a workspace that refuses the user, as one that requires two-step verification while the account does not have it on, is listed with its name, `refused`, and no figure at all. Pass the page's `nextCursor` as `cursor` for the next one; a cursor no page gave is a bad request. API keys belong to a workspace, not to anyone, and get 403, as do OAuth tokens bound to one workspace; the command line's token, bound to none, reads every workspace with what its scopes allow there.
     *
     * Example:
     * ```php
     * $client->overview->get(
     *     new GetOverviewRequest([]),
     * );
     * ```
     *
     * @param GetOverviewRequest $request
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?Overview
     * @throws PealException
     * @throws PealApiException
     */
    public function get(GetOverviewRequest $request = new GetOverviewRequest(), ?array $options = null): ?Overview
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
                    path: "api/me/overview",
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
                return Overview::fromJson($json);
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
     * Lists the posts with a time from `from` (included) to `to` (excluded), at most 31 days apart (InvalidTimeRange otherwise), across the workspaces where the user may read posts (`post:read`), or only those of them that `workspaceIds` names (comma-separated ids). Posts waiting for an approval, scheduled, publishing and finished are listed; drafts and cancelled posts are not. They come by time, then id, 50 a page unless `limit` (at most 100) says otherwise; pass the page's `nextCursor` as `cursor`, with the same query, for the next one. Each post is light: its workspace, its time and zone, its status, its platforms (null where the user may not read the workspace's channels) and the first 140 characters of its text. API keys belong to a workspace, not to anyone, and get 403, as do OAuth tokens bound to one workspace; the command line's token, bound to none, reads every workspace with what its scopes allow there.
     *
     * Example:
     * ```php
     * $client->overview->agenda(
     *     new AgendaOverviewRequest([
     *         'from' => 'from',
     *         'to' => 'to',
     *     ]),
     * );
     * ```
     *
     * @param AgendaOverviewRequest $request
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?AgendaPage
     * @throws PealException
     * @throws PealApiException
     */
    public function agenda(AgendaOverviewRequest $request, ?array $options = null): ?AgendaPage
    {
        $options = array_merge($this->options, $options ?? []);
        $query = [];
        $query['from'] = $request->from;
        $query['to'] = $request->to;
        if ($request->cursor != null) {
            $query['cursor'] = $request->cursor;
        }
        if ($request->limit != null) {
            $query['limit'] = $request->limit;
        }
        if ($request->workspaceIds != null) {
            $query['workspaceIds'] = $request->workspaceIds;
        }
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/me/agenda",
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
                return AgendaPage::fromJson($json);
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
     * Answers what went out in each workspace the user belongs to and how it did, 50 workspaces a page at most, by name then id: each workspace's totals of the posts published in the range (likes, reposts, replies, quotes, impressions, clicks, reach, saves; null where no platform of the workspace gives one, never zero), followers and their change, and the same for the range before with `previousKept` (false where a platform's terms keep less than the range before goes back: show no change then), as that workspace's own dashboard answers them. The range is `days` (7, 30 or 90, 30 unless given: that many days ending today in `timeZone`, an IANA zone such as Europe/Paris), beside the range before, of the same length. `analytics` is null where the user's role may not read the workspace's analytics (`analytics:read`), and in a workspace that refuses the user (`refused`). Figures of different platforms are not alike: compare a workspace with itself, not with another. Pass the page's `nextCursor` as `cursor` for the next one. API keys belong to a workspace, not to anyone, and get 403, as do OAuth tokens bound to one workspace; the command line's token, bound to none, reads every workspace with what its scopes allow there.
     *
     * Example:
     * ```php
     * $client->overview->report(
     *     new ReportOverviewRequest([
     *         'timeZone' => 'timeZone',
     *     ]),
     * );
     * ```
     *
     * @param ReportOverviewRequest $request
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?ReportAcrossWorkspaces
     * @throws PealException
     * @throws PealApiException
     */
    public function report(ReportOverviewRequest $request, ?array $options = null): ?ReportAcrossWorkspaces
    {
        $options = array_merge($this->options, $options ?? []);
        $query = [];
        $query['timeZone'] = $request->timeZone;
        if ($request->days != null) {
            $query['days'] = $request->days;
        }
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
                    path: "api/me/report",
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
                return ReportAcrossWorkspaces::fromJson($json);
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
     * Streams the report across workspaces as a CSV file, RFC 4180: a header line, then one line a workspace the user belongs to, by name then id, with the columns `workspaceId`, `workspace`, `from`, `to`, `posts`, `likes`, `reposts`, `replies`, `quotes`, `impressions`, `clicks`, `reach`, `saves`, `engagement`, `followers`, `followersGained`, `previousKept`, `previousPosts`, `previousLikes`, `previousReposts`, `previousReplies`, `previousQuotes`, `previousImpressions`, `previousClicks`, `previousReach`, `previousSaves`, `previousEngagement`, `previousFollowers`, `previousFollowersGained`. A count no platform gives, a workspace whose analytics the user may not read, and the range before where `previousKept` is false, are empty cells; every text cell is in quotes, and one a spreadsheet would take for a formula, at its start or after a semicolon, starts with an apostrophe. The range is `days` (7, 30 or 90, 30 unless given: that many days ending today in `timeZone`, an IANA zone such as Europe/Paris), beside the range before, of the same length. API keys belong to a workspace, not to anyone, and get 403, as do OAuth tokens bound to one workspace; the command line's token, bound to none, reads every workspace with what its scopes allow there.
     *
     * Example:
     * ```php
     * $client->overview->reportExport(
     *     new ReportExportOverviewRequest([
     *         'timeZone' => 'timeZone',
     *     ]),
     * );
     * ```
     *
     * @param ReportExportOverviewRequest $request
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
    public function reportExport(ReportExportOverviewRequest $request, ?array $options = null): string
    {
        $options = array_merge($this->options, $options ?? []);
        $query = [];
        $query['timeZone'] = $request->timeZone;
        if ($request->days != null) {
            $query['days'] = $request->days;
        }
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/me/report/export",
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
}
