<?php

namespace Peal\Recycling;

use Psr\Http\Client\ClientInterface;
use Peal\Core\Client\RawClient;
use Peal\Recycling\Requests\ListRecyclingRequest;
use Peal\Types\RecyclingRulePage;
use Peal\Exceptions\PealException;
use Peal\Exceptions\PealApiException;
use Peal\Core\Json\JsonApiRequest;
use Peal\Environments;
use Peal\Core\Client\HttpMethod;
use JsonException;
use Psr\Http\Client\ClientExceptionInterface;
use Peal\Recycling\Requests\NewRecyclingRule;
use Peal\Types\RecyclingRule;
use Peal\Recycling\Requests\RecyclingRuleChange;
use Peal\Recycling\Requests\RecyclingResume;

class RecyclingClient
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
     * Lists the workspace's recycling rules, oldest first, 50 a page unless `limit` (at most 100) says otherwise, those with `status` alone when given, each with its next 3 posts to come. Pass the page's `nextCursor` as `cursor` for the next one. Needs post:read.
     *
     * Example:
     * ```php
     * $client->recycling->list(
     *     'workspaceId',
     *     new ListRecyclingRequest([]),
     * );
     * ```
     *
     * @param string $workspaceId
     * @param ListRecyclingRequest $request
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?RecyclingRulePage
     * @throws PealException
     * @throws PealApiException
     */
    public function list(string $workspaceId, ListRecyclingRequest $request = new ListRecyclingRequest(), ?array $options = null): ?RecyclingRulePage
    {
        $options = array_merge($this->options, $options ?? []);
        $query = [];
        if ($request->cursor != null) {
            $query['cursor'] = $request->cursor;
        }
        if ($request->limit != null) {
            $query['limit'] = $request->limit;
        }
        if ($request->status != null) {
            $query['status'] = $request->status;
        }
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/workspaces/{$workspaceId}/recycling",
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
                return RecyclingRulePage::fromJson($json);
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
     * Starts a rule that repeats a post that is scheduled, publishing or went out (deleted from a platform since or not): `every` 1 to 365 days, 1 to 52 weeks or 1 to 12 months, until `count` posts in all (2 to 100, the source counted) or until the day `until`, and never more than 100; with up to 10 text `variants`, each checked as the source saying it would be, and optionally on a queue. Each post a rule makes is a new post, copied from the source with what the workspace still has (its channels still connected, its media, the options on them, its tags; never a signature or a default added since), and sent as any post is: the same checks, the approval policy, the month's room in the plan, its own job, outcome and notices. It says the source's text, then each variant in turn, then the source's again. The next post is made once the latest one's time has passed, one interval after the one before at the same wall-clock time in the source's zone (a month shorter than the day takes its last day), or on the queue's first free slot from then; a time missed while nothing ran is skipped, never made up for. Each acts as whoever started the rule, with what they may do when it is made: a member removed, a key revoked or an application whose grant no longer publishes ends it. A post has one rule going on at a time, and a workspace 100 active or paused. It publishes again, in public, without anyone being asked each time, unless the approval policy holds the starter's posts: then each waits for an approval. Needs post:schedule, or post:create where posts wait for an approval; never staff acting as a member.
     *
     * Example:
     * ```php
     * $client->recycling->create(
     *     'workspaceId',
     *     new NewRecyclingRule([
     *         'every' => new RecyclingInterval([
     *             'count' => 1,
     *             'unit' => RecyclingUnit::Days->value,
     *         ]),
     *         'postId' => 'postId',
     *     ]),
     * );
     * ```
     *
     * @param string $workspaceId
     * @param NewRecyclingRule $request
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?RecyclingRule
     * @throws PealException
     * @throws PealApiException
     */
    public function create(string $workspaceId, NewRecyclingRule $request, ?array $options = null): ?RecyclingRule
    {
        $options = array_merge($this->options, $options ?? []);
        $options['maxRetries'] = 0;
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/workspaces/{$workspaceId}/recycling",
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
                return RecyclingRule::fromJson($json);
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
     * Answers with a rule of the workspace and its next 3 posts to come, each with the variant it will say. Needs post:read.
     *
     * Example:
     * ```php
     * $client->recycling->get(
     *     'workspaceId',
     *     'ruleId',
     * );
     * ```
     *
     * @param string $workspaceId
     * @param string $ruleId
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?RecyclingRule
     * @throws PealException
     * @throws PealApiException
     */
    public function get(string $workspaceId, string $ruleId, ?array $options = null): ?RecyclingRule
    {
        $options = array_merge($this->options, $options ?? []);
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/workspaces/{$workspaceId}/recycling/{$ruleId}",
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
                return RecyclingRule::fromJson($json);
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
     * Stops a rule: it makes no more posts and ends `stopped`; the posts it made stay as they are, scheduled ones included. Stopping an ended rule changes nothing. Needs post:schedule, or to be the rule's starter acting as they started it: in the web app, through the same application or with the same API key.
     *
     * Example:
     * ```php
     * $client->recycling->delete(
     *     'workspaceId',
     *     'ruleId',
     * );
     * ```
     *
     * @param string $workspaceId
     * @param string $ruleId
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
    public function delete(string $workspaceId, string $ruleId, ?array $options = null): void
    {
        $options = array_merge($this->options, $options ?? []);
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/workspaces/{$workspaceId}/recycling/{$ruleId}",
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
     * Changes a rule's variants, its `count` or `until` (null takes it away), or pauses it (`paused` true) or sets it going again (false); what it leaves out stays. A post already made keeps what it says. An ended rule changes no more (RecyclingRuleEnded): resume it. Needs post:schedule, or to be the rule's starter acting as they started it: in the web app, through the same application or with the same API key.
     *
     * Example:
     * ```php
     * $client->recycling->update(
     *     'workspaceId',
     *     'ruleId',
     *     new RecyclingRuleChange([]),
     * );
     * ```
     *
     * @param string $workspaceId
     * @param string $ruleId
     * @param RecyclingRuleChange $request
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?RecyclingRule
     * @throws PealException
     * @throws PealApiException
     */
    public function update(string $workspaceId, string $ruleId, RecyclingRuleChange $request = new RecyclingRuleChange(), ?array $options = null): ?RecyclingRule
    {
        $options = array_merge($this->options, $options ?? []);
        $options['maxRetries'] = 0;
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/workspaces/{$workspaceId}/recycling/{$ruleId}",
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
                return RecyclingRule::fromJson($json);
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
     * Sets a paused rule going again, or one that ended for a reason that can be put right (`planLimit`, `contentRejected`, `noChannels`, `queueFull`, `sourceWithdrawn`), with other `variants` if given: its next post is due at the first due instant after now. Any other ended rule is RecyclingRuleEnded. Its source must be scheduled, publishing or out (PostNotRecyclable `draft`, `awaitingApproval` or `cancelled` otherwise); an ended rule whose source another rule repeats now is PostNotRecyclable `repeating`, and one the workspace has no room for is TooManyRecyclingRules. Needs post:schedule, or to be the rule's starter acting as they started it: in the web app, through the same application or with the same API key.
     *
     * Example:
     * ```php
     * $client->recycling->resume(
     *     'workspaceId',
     *     'ruleId',
     *     new RecyclingResume([]),
     * );
     * ```
     *
     * @param string $workspaceId
     * @param string $ruleId
     * @param RecyclingResume $request
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?RecyclingRule
     * @throws PealException
     * @throws PealApiException
     */
    public function resume(string $workspaceId, string $ruleId, RecyclingResume $request = new RecyclingResume(), ?array $options = null): ?RecyclingRule
    {
        $options = array_merge($this->options, $options ?? []);
        $options['maxRetries'] = 0;
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/workspaces/{$workspaceId}/recycling/{$ruleId}/resume",
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
                return RecyclingRule::fromJson($json);
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
