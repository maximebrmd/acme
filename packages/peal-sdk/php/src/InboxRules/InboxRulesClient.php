<?php

namespace Peal\InboxRules;

use Psr\Http\Client\ClientInterface;
use Peal\Core\Client\RawClient;
use Peal\InboxRules\Requests\ListCommentRulesInboxRulesRequest;
use Peal\Types\CommentRulePage;
use Peal\Exceptions\PealException;
use Peal\Exceptions\PealApiException;
use Peal\Core\Json\JsonApiRequest;
use Peal\Environments;
use Peal\Core\Client\HttpMethod;
use JsonException;
use Psr\Http\Client\ClientExceptionInterface;
use Peal\InboxRules\Requests\NewCommentRule;
use Peal\Types\CommentRule;
use Peal\InboxRules\Requests\CommentRuleChange;

class InboxRulesClient
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
     * Lists the workspace's comment rules, oldest first, 50 a page unless `limit` (at most 100) says otherwise, those with `status` alone when given, each with what its channels can carry and the latest 20 comments it matched. Needs engagement:read.
     *
     * Example:
     * ```php
     * $client->inboxRules->listCommentRules(
     *     'workspaceId',
     *     new ListCommentRulesInboxRulesRequest([]),
     * );
     * ```
     *
     * @param string $workspaceId
     * @param ListCommentRulesInboxRulesRequest $request
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?CommentRulePage
     * @throws PealException
     * @throws PealApiException
     */
    public function listCommentRules(string $workspaceId, ListCommentRulesInboxRulesRequest $request = new ListCommentRulesInboxRulesRequest(), ?array $options = null): ?CommentRulePage
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
                    path: "api/workspaces/{$workspaceId}/inbox/rules",
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
                return CommentRulePage::fromJson($json);
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
     * Starts a rule on the comments of a post that went out (`postId`) or of every post of a channel (`channelId`), exactly one of them, with 1 to 10 `keywords` and a `reply`. A rule answers, by itself and in public, as the channel's account, a comment written after it started or was last set going again, under a post it answers on (a post's rule acts on the channels the post is for, scheduled or out), that holds one of its keywords as a word (whatever its case and accents): with its `reply`, once a comment and once a person, 25 replies a day at most, and 100 a day for every rule of a channel together, through the inbox's own replies (their journal, one reply a comment, each one of the billing account's outbound messages). It answers on Mastodon, and on Facebook Pages and Instagram where the server reads their comments; Bluesky's, X's, LinkedIn's and YouTube's rules forbid an app to answer by itself, and `channels` says so. It never likes, follows or messages anyone privately. It acts as whoever started it, with what they may do then: it ends when they can no longer answer comments, and when its channel is disconnected. It is refused when no channel it answers on can carry its reply (CommentRuleNotPossible, with each channel's reason). A workspace keeps 100 rules active or paused. Needs engagement:reply; never staff acting as a member.
     *
     * Example:
     * ```php
     * $client->inboxRules->createCommentRule(
     *     'workspaceId',
     *     new NewCommentRule([
     *         'keywords' => [
     *             'keywords',
     *         ],
     *         'reply' => 'reply',
     *     ]),
     * );
     * ```
     *
     * @param string $workspaceId
     * @param NewCommentRule $request
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?CommentRule
     * @throws PealException
     * @throws PealApiException
     */
    public function createCommentRule(string $workspaceId, NewCommentRule $request, ?array $options = null): ?CommentRule
    {
        $options = array_merge($this->options, $options ?? []);
        $options['maxRetries'] = 0;
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/workspaces/{$workspaceId}/inbox/rules",
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
                return CommentRule::fromJson($json);
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
     * Answers a comment rule of the workspace, what its channels can carry and what it matched. Needs engagement:read.
     *
     * Example:
     * ```php
     * $client->inboxRules->getCommentRule(
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
     * @return ?CommentRule
     * @throws PealException
     * @throws PealApiException
     */
    public function getCommentRule(string $workspaceId, string $ruleId, ?array $options = null): ?CommentRule
    {
        $options = array_merge($this->options, $options ?? []);
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/workspaces/{$workspaceId}/inbox/rules/{$ruleId}",
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
                return CommentRule::fromJson($json);
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
     * Stops a rule: it answers nothing more; the replies it sent stay, and the inbox withdraws one as any other. Needs engagement:reply.
     *
     * Example:
     * ```php
     * $client->inboxRules->deleteCommentRule(
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
    public function deleteCommentRule(string $workspaceId, string $ruleId, ?array $options = null): void
    {
        $options = array_merge($this->options, $options ?? []);
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/workspaces/{$workspaceId}/inbox/rules/{$ruleId}",
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
     * Changes a rule's keywords or reply, or pauses it (`paused` true) or sets it going again (false); what it leaves out stays. A paused rule looks at nothing, and answers no comment received while it was paused. An ended rule changes no more (CommentRuleEnded). Needs engagement:reply.
     *
     * Example:
     * ```php
     * $client->inboxRules->updateCommentRule(
     *     'workspaceId',
     *     'ruleId',
     *     new CommentRuleChange([]),
     * );
     * ```
     *
     * @param string $workspaceId
     * @param string $ruleId
     * @param CommentRuleChange $request
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?CommentRule
     * @throws PealException
     * @throws PealApiException
     */
    public function updateCommentRule(string $workspaceId, string $ruleId, CommentRuleChange $request = new CommentRuleChange(), ?array $options = null): ?CommentRule
    {
        $options = array_merge($this->options, $options ?? []);
        $options['maxRetries'] = 0;
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/workspaces/{$workspaceId}/inbox/rules/{$ruleId}",
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
                return CommentRule::fromJson($json);
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
