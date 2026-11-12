<?php

namespace Peal\Usage;

use Psr\Http\Client\ClientInterface;
use Peal\Core\Client\RawClient;
use Peal\Usage\Requests\GetUsageRequest;
use Peal\Types\WorkspaceUsageReport;
use Peal\Exceptions\PealException;
use Peal\Exceptions\PealApiException;
use Peal\Core\Json\JsonApiRequest;
use Peal\Environments;
use Peal\Core\Client\HttpMethod;
use JsonException;
use Psr\Http\Client\ClientExceptionInterface;
use Peal\Usage\Requests\PartnerUsageRequest;
use Peal\Types\PartnerUsageReport;

class UsageClient
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
     * Answers what the workspace uses of its plan now, and day by day from `from` to `to` (UTC days, both included, at most 92; by default the 30 days that end today): each day's posts that went out, one per channel they went out on, by platform, and its requests to the writing assistant; the channels it connected, its members and the media it stored as the daily snapshot found them shortly after each day ended, null (requests included) for a day the server took no snapshot of, today's among them; then the period's totals, with its channel-days and, for each calendar month it touches, its posts on platforms that bill the server per post, each part of a thread counted as the platform bills it (a thread is one of the day's posts). Usage is kept 400 days. Counts only: nothing here is priced or limits anything. On a server that does not bill, `plan` and `allowances` are null. Needs billing:read.
     *
     * Example:
     * ```php
     * $client->usage->get(
     *     'workspaceId',
     *     new GetUsageRequest([]),
     * );
     * ```
     *
     * @param string $workspaceId
     * @param GetUsageRequest $request
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?WorkspaceUsageReport
     * @throws PealException
     * @throws PealApiException
     */
    public function get(string $workspaceId, GetUsageRequest $request = new GetUsageRequest(), ?array $options = null): ?WorkspaceUsageReport
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
                    path: "api/workspaces/{$workspaceId}/usage",
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
                return WorkspaceUsageReport::fromJson($json);
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
     * Answers what the partner account uses across the workspaces it holds, from `from` to `to` (UTC days, both included, at most 92; by default the 30 days that end today), and per workspace. `current` is what it holds now: the workspaces it owns and the channels connected across them and its home workspace, which its plan's channel limit counts. Each day gives the workspaces it owned and the channels connected across them as the daily count found them at 23:41 UTC (null for a day without a count), and the posts that went out in the workspaces that still exist. `workspaces` is a page of its workspaces with each one's external id, the channels it connected itself now, and over the period its channel-days, posts by platform, requests to the writing assistant, latest media storage and, for each calendar month the period touches, posts on platforms that bill the server per post: newest first, 50 a page unless `limit` (at most 100) says otherwise, in the order and with the cursor of the list of the partner's workspaces (pass `next` as `before`; anything else is refused, 400); the home workspace comes first, on the first page only, one more than asked. A workspace offboarded during the period is no longer listed, and its posts leave the sums, as its counts were erased with it; the daily `workspaces` and `channels` still count it for the days it existed. Kept 400 days. Counts only: nothing here is priced or limits anything. On a server that does not bill, `plan` and `allowances` are null. For the people of the partner's home workspace: a workspace with no partner account answers 404 `PartnerNotFound`. A partner key reads the same at `GET /api/partner/usage`. Needs partner:read.
     *
     * Example:
     * ```php
     * $client->usage->partner(
     *     'workspaceId',
     *     new PartnerUsageRequest([]),
     * );
     * ```
     *
     * @param string $workspaceId
     * @param PartnerUsageRequest $request
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?PartnerUsageReport
     * @throws PealException
     * @throws PealApiException
     */
    public function partner(string $workspaceId, PartnerUsageRequest $request = new PartnerUsageRequest(), ?array $options = null): ?PartnerUsageReport
    {
        $options = array_merge($this->options, $options ?? []);
        $query = [];
        if ($request->before != null) {
            $query['before'] = $request->before;
        }
        if ($request->from != null) {
            $query['from'] = $request->from;
        }
        if ($request->limit != null) {
            $query['limit'] = $request->limit;
        }
        if ($request->to != null) {
            $query['to'] = $request->to;
        }
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/workspaces/{$workspaceId}/usage/partner",
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
                return PartnerUsageReport::fromJson($json);
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
