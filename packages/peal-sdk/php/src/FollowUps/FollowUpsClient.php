<?php

namespace Peal\FollowUps;

use Psr\Http\Client\ClientInterface;
use Peal\Core\Client\RawClient;
use Peal\FollowUps\Requests\ListFollowUpsRequest;
use Peal\Types\FollowUpRulePage;
use Peal\Exceptions\PealException;
use Peal\Exceptions\PealApiException;
use Peal\Core\Json\JsonApiRequest;
use Peal\Environments;
use Peal\Core\Client\HttpMethod;
use JsonException;
use Psr\Http\Client\ClientExceptionInterface;
use Peal\FollowUps\Requests\NewFollowUpRule;
use Peal\Types\FollowUpRule;
use Peal\FollowUps\Requests\FollowUpRuleChange;

class FollowUpsClient
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
     * Lists the workspace's follow-up rules, oldest first, 50 a page unless `limit` (at most 100) says otherwise, those of the post `postId` or with `status` alone when given, each with what its channels can carry and its latest 20 follow-ups. Pass the page's `nextCursor` as `cursor` for the next one. Needs post:read.
     *
     * Example:
     * ```php
     * $client->followUps->list(
     *     'workspaceId',
     *     new ListFollowUpsRequest([]),
     * );
     * ```
     *
     * @param string $workspaceId
     * @param ListFollowUpsRequest $request
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?FollowUpRulePage
     * @throws PealException
     * @throws PealApiException
     */
    public function list(string $workspaceId, ListFollowUpsRequest $request = new ListFollowUpsRequest(), ?array $options = null): ?FollowUpRulePage
    {
        $options = array_merge($this->options, $options ?? []);
        $query = [];
        if ($request->cursor != null) {
            $query['cursor'] = $request->cursor;
        }
        if ($request->limit != null) {
            $query['limit'] = $request->limit;
        }
        if ($request->postId != null) {
            $query['postId'] = $request->postId;
        }
        if ($request->status != null) {
            $query['status'] = $request->status;
        }
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/workspaces/{$workspaceId}/follow-ups",
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
                return FollowUpRulePage::fromJson($json);
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
     * Starts a rule on a post (`postId`) or on every post a channel publishes from now on (`channelId`), exactly one of them, that waits for `likes` likes (1 to 1,000,000) and then publishes `comment`, reposts (`repost`), or both. A rule acts on the workspace's own posts only, from the channel's own account: once a post it acts on has `likes` likes on a channel, as analytics last counted them (hourly for two days, then daily: a rule never asks a platform for more, nor makes a paid read happen), it publishes its `comment` under the post, as the account's own reply after the post's last part, and reposts it when `repost` is set, once each, within 7 days of the post going live there. A post is followed up once of each kind whatever rules act on it, and a channel carries 10 follow-ups a UTC day at most: those past it wait for the next day, within their window. Comments go out on Bluesky, Mastodon and X (a post X bills, and only where the server sends X threads), reposts on Bluesky (a channel connected before Peal asked for it must be connected again) and Mastodon; LinkedIn's terms forbid both, and elsewhere `channels` says why not. Nothing likes, follows or messages anyone. It acts as whoever started it, with what they may do then: where the approval policy holds their posts it waits for a member who approves posts to approve it, and it ends when they can no longer publish. What each did is in `followUps`. A post that already went out is armed at once, while its window lasts. It is refused when no channel it acts on can carry what it asks, or when its comment is longer than a channel that could carry it takes (FollowUpNotPossible, with each channel's reasons). A post or a channel has one rule going on at a time (FollowUpRuleTaken), and a workspace 100 active or paused. It publishes again, in public, without anyone being asked each time. Needs post:schedule, or post:create where posts wait for an approval; never staff acting as a member.
     *
     * Example:
     * ```php
     * $client->followUps->create(
     *     'workspaceId',
     *     new NewFollowUpRule([
     *         'likes' => 1,
     *     ]),
     * );
     * ```
     *
     * @param string $workspaceId
     * @param NewFollowUpRule $request
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?FollowUpRule
     * @throws PealException
     * @throws PealApiException
     */
    public function create(string $workspaceId, NewFollowUpRule $request, ?array $options = null): ?FollowUpRule
    {
        $options = array_merge($this->options, $options ?? []);
        $options['maxRetries'] = 0;
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/workspaces/{$workspaceId}/follow-ups",
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
                return FollowUpRule::fromJson($json);
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
     * Answers with a rule of the workspace, what its channels can carry and its latest 20 follow-ups. Needs post:read.
     *
     * Example:
     * ```php
     * $client->followUps->get(
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
     * @return ?FollowUpRule
     * @throws PealException
     * @throws PealApiException
     */
    public function get(string $workspaceId, string $ruleId, ?array $options = null): ?FollowUpRule
    {
        $options = array_merge($this->options, $options ?? []);
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/workspaces/{$workspaceId}/follow-ups/{$ruleId}",
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
                return FollowUpRule::fromJson($json);
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
     * Stops a rule: it ends `stopped`, what it armed and did not send is given up, and what it sent stays on the platforms. Stopping an ended rule changes nothing. Needs post:schedule, or to be the rule's starter acting as they started it.
     *
     * Example:
     * ```php
     * $client->followUps->delete(
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
                    path: "api/workspaces/{$workspaceId}/follow-ups/{$ruleId}",
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
     * Changes a rule's `likes`, its `comment` (null takes it away) or whether it reposts, or pauses it (`paused` true) or sets it going again (false); what it leaves out stays. A follow-up that went out stays as it is; one armed sends what the rule says when it goes. Where the approval policy holds the posts of whoever changes what the rule sends, it waits for an approval again. A paused rule sends nothing, and what it armed expires with its window. An ended rule changes no more (FollowUpRuleEnded). Needs post:schedule, or to be the rule's starter acting as they started it: in the web app, through the same application or with the same API key.
     *
     * Example:
     * ```php
     * $client->followUps->update(
     *     'workspaceId',
     *     'ruleId',
     *     new FollowUpRuleChange([]),
     * );
     * ```
     *
     * @param string $workspaceId
     * @param string $ruleId
     * @param FollowUpRuleChange $request
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?FollowUpRule
     * @throws PealException
     * @throws PealApiException
     */
    public function update(string $workspaceId, string $ruleId, FollowUpRuleChange $request = new FollowUpRuleChange(), ?array $options = null): ?FollowUpRule
    {
        $options = array_merge($this->options, $options ?? []);
        $options['maxRetries'] = 0;
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/workspaces/{$workspaceId}/follow-ups/{$ruleId}",
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
                return FollowUpRule::fromJson($json);
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
     * Approves what a rule sends, for a rule whose starter's posts wait for an approval: it then acts as it is. A rule approved, or that needs no approval, is answered as it is. Needs post:approve, in person: an API key or an application never approves.
     *
     * Example:
     * ```php
     * $client->followUps->approve(
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
     * @return ?FollowUpRule
     * @throws PealException
     * @throws PealApiException
     */
    public function approve(string $workspaceId, string $ruleId, ?array $options = null): ?FollowUpRule
    {
        $options = array_merge($this->options, $options ?? []);
        $options['maxRetries'] = 0;
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/workspaces/{$workspaceId}/follow-ups/{$ruleId}/approve",
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
                return FollowUpRule::fromJson($json);
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
