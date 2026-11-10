<?php

namespace Peal\Review;

use Psr\Http\Client\ClientInterface;
use Peal\Core\Client\RawClient;
use Peal\Types\ReviewSettings;
use Peal\Exceptions\PealException;
use Peal\Exceptions\PealApiException;
use Peal\Core\Json\JsonApiRequest;
use Peal\Environments;
use Peal\Core\Client\HttpMethod;
use JsonException;
use Psr\Http\Client\ClientExceptionInterface;
use Peal\Review\Requests\UpdateSettingsReviewRequest;
use Peal\Types\ApprovalRequest;
use Peal\Core\Json\JsonDecoder;
use Peal\Types\PostReview;
use Peal\Review\Requests\NewComment;
use Peal\Types\ReviewComment;
use Peal\Review\Requests\ResolveReviewRequest;
use Peal\Review\Requests\ApprovalDecision;
use Peal\Types\ApprovalOutcome;
use Peal\Review\Requests\ChangesRequest;
use Peal\Types\ChangesOutcome;
use Peal\Types\ReviewLink;
use Peal\Review\Requests\NewReviewLink;
use Peal\Types\CreatedReviewLink;

class ReviewClient
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
     * Answers with the workspace's approval policy: which of its posts wait for an approval before they are scheduled. Needs post:read.
     *
     * Example:
     * ```php
     * $client->review->settings(
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
     * @return ?ReviewSettings
     * @throws PealException
     * @throws PealApiException
     */
    public function settings(string $workspaceId, ?array $options = null): ?ReviewSettings
    {
        $options = array_merge($this->options, $options ?? []);
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/workspaces/{$workspaceId}/review/settings",
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
                return ReviewSettings::fromJson($json);
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
     * Chooses the workspace's approval policy. It applies to posts scheduled from then on: a post already scheduled stays scheduled, and one that waits still waits. Needs organization:update, and is refused to staff acting as a member.
     *
     * Example:
     * ```php
     * $client->review->updateSettings(
     *     'workspaceId',
     *     new UpdateSettingsReviewRequest([
     *         'body' => new ReviewSettings([
     *             'approvalPolicy' => ApprovalPolicy::Never->value,
     *         ]),
     *     ]),
     * );
     * ```
     *
     * @param string $workspaceId
     * @param UpdateSettingsReviewRequest $request
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?ReviewSettings
     * @throws PealException
     * @throws PealApiException
     */
    public function updateSettings(string $workspaceId, UpdateSettingsReviewRequest $request, ?array $options = null): ?ReviewSettings
    {
        $options = array_merge($this->options, $options ?? []);
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/workspaces/{$workspaceId}/review/settings",
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
                return ReviewSettings::fromJson($json);
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
     * Lists the approvals that wait in the workspace, oldest first, 100 at most. Needs post:read.
     *
     * Example:
     * ```php
     * $client->review->pending(
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
     * @return ?array<ApprovalRequest>
     * @throws PealException
     * @throws PealApiException
     */
    public function pending(string $workspaceId, ?array $options = null): ?array
    {
        $options = array_merge($this->options, $options ?? []);
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/workspaces/{$workspaceId}/approvals",
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
                return JsonDecoder::decodeArray($json, [ApprovalRequest::class]); // @phpstan-ignore-line
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
     * Answers with a post's review: its comments, oldest first, and the approvals asked for it and what was decided, newest first. Needs post:read.
     *
     * Example:
     * ```php
     * $client->review->thread(
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
     * @return ?PostReview
     * @throws PealException
     * @throws PealApiException
     */
    public function thread(string $workspaceId, string $postId, ?array $options = null): ?PostReview
    {
        $options = array_merge($this->options, $options ?? []);
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/workspaces/{$workspaceId}/posts/{$postId}/review",
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
                return PostReview::fromJson($json);
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
     * Comments on a post, starts a thread about one of its channels or some words of its text there, or answers a thread. The text is kept as plain text, 2000 characters at most, without control characters. Those who follow the post are told. Needs post:create or post:approve, and is refused to staff acting as a member.
     *
     * Example:
     * ```php
     * $client->review->comment(
     *     'workspaceId',
     *     'postId',
     *     new NewComment([
     *         'text' => 'text',
     *     ]),
     * );
     * ```
     *
     * @param string $workspaceId
     * @param string $postId
     * @param NewComment $request
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?ReviewComment
     * @throws PealException
     * @throws PealApiException
     */
    public function comment(string $workspaceId, string $postId, NewComment $request, ?array $options = null): ?ReviewComment
    {
        $options = array_merge($this->options, $options ?? []);
        $options['maxRetries'] = 0;
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/workspaces/{$workspaceId}/posts/{$postId}/comments",
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
                return ReviewComment::fromJson($json);
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
     * Resolves the thread a comment started, or reopens it. An answer is not resolved: its thread is (CommentInvalid, `parent`). Needs post:create or post:approve, and is refused to staff acting as a member.
     *
     * Example:
     * ```php
     * $client->review->resolve(
     *     'workspaceId',
     *     'postId',
     *     'commentId',
     *     new ResolveReviewRequest([
     *         'resolved' => true,
     *     ]),
     * );
     * ```
     *
     * @param string $workspaceId
     * @param string $postId
     * @param string $commentId
     * @param ResolveReviewRequest $request
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?ReviewComment
     * @throws PealException
     * @throws PealApiException
     */
    public function resolve(string $workspaceId, string $postId, string $commentId, ResolveReviewRequest $request, ?array $options = null): ?ReviewComment
    {
        $options = array_merge($this->options, $options ?? []);
        $options['maxRetries'] = 0;
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/workspaces/{$workspaceId}/posts/{$postId}/comments/{$commentId}",
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
                return ReviewComment::fromJson($json);
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
     * Approves a post that waits for an approval, as the reviewer was shown it: send the `id` and the `subjectHash` of the approval that waits, as the post's review or the list of approvals gave them. When the post was asked again or says something else since, nothing is approved (ApprovalChanged): read it again. It is scheduled for the time it was asked for, and its job starts. Approved after that time (beyond a minute), nothing is published late: the post goes back to draft, still approved, and `late` is true; scheduling it again needs no new approval while it says the same. Recorded with who approved and when. In a workspace that holds more channels or members than its plan allows, which schedules nothing, nothing is approved (PlanLimitReached) and the post keeps waiting. Needs post:approve, and is refused to staff acting as a member.
     *
     * Example:
     * ```php
     * $client->review->approve(
     *     'workspaceId',
     *     'postId',
     *     new ApprovalDecision([
     *         'approvalId' => 'approvalId',
     *         'subjectHash' => 'subjectHash',
     *     ]),
     * );
     * ```
     *
     * @param string $workspaceId
     * @param string $postId
     * @param ApprovalDecision $request
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?ApprovalOutcome
     * @throws PealException
     * @throws PealApiException
     */
    public function approve(string $workspaceId, string $postId, ApprovalDecision $request, ?array $options = null): ?ApprovalOutcome
    {
        $options = array_merge($this->options, $options ?? []);
        $options['maxRetries'] = 0;
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/workspaces/{$workspaceId}/posts/{$postId}/approve",
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
                return ApprovalOutcome::fromJson($json);
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
     * Sends a post that waits for an approval back to draft, with a comment that says what to change, and the `id` and `subjectHash` of the approval it refuses, as for approving. Its author and whoever asked are told. Needs post:approve, and is refused to staff acting as a member.
     *
     * Example:
     * ```php
     * $client->review->requestChanges(
     *     'workspaceId',
     *     'postId',
     *     new ChangesRequest([
     *         'approvalId' => 'approvalId',
     *         'subjectHash' => 'subjectHash',
     *         'comment' => 'comment',
     *     ]),
     * );
     * ```
     *
     * @param string $workspaceId
     * @param string $postId
     * @param ChangesRequest $request
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?ChangesOutcome
     * @throws PealException
     * @throws PealApiException
     */
    public function requestChanges(string $workspaceId, string $postId, ChangesRequest $request, ?array $options = null): ?ChangesOutcome
    {
        $options = array_merge($this->options, $options ?? []);
        $options['maxRetries'] = 0;
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/workspaces/{$workspaceId}/posts/{$postId}/request-changes",
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
                return ChangesOutcome::fromJson($json);
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
     * Lists a post's review links, newest first, ended ones included. No token is shown: a link's address is told once, when it is made. Needs post:read.
     *
     * Example:
     * ```php
     * $client->review->links(
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
     * @return ?array<ReviewLink>
     * @throws PealException
     * @throws PealApiException
     */
    public function links(string $workspaceId, string $postId, ?array $options = null): ?array
    {
        $options = array_merge($this->options, $options ?? []);
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/workspaces/{$workspaceId}/posts/{$postId}/review-links",
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
                return JsonDecoder::decodeArray($json, [ReviewLink::class]); // @phpstan-ignore-line
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
     * Makes a link that shows a draft, a post that waits for an approval or a scheduled post to whoever holds it, without an account: the post as each channel will receive it, and nothing else of the workspace. It lets them view, comment, or approve, and works 14 days unless `expiresInHours` says otherwise (90 days at most), until it is revoked, or the post is published, cancelled or deleted. A post has 20 working links at most. The answer holds the link's address, which is not shown again. Needs post:approve, and is refused to staff acting as a member. A link that lets its holders approve is made in the web app only: an API key or an OAuth client is refused one, as it would approve its own posts with it.
     *
     * Example:
     * ```php
     * $client->review->createLink(
     *     'workspaceId',
     *     'postId',
     *     new NewReviewLink([
     *         'access' => ReviewLinkAccess::View->value,
     *     ]),
     * );
     * ```
     *
     * @param string $workspaceId
     * @param string $postId
     * @param NewReviewLink $request
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?CreatedReviewLink
     * @throws PealException
     * @throws PealApiException
     */
    public function createLink(string $workspaceId, string $postId, NewReviewLink $request, ?array $options = null): ?CreatedReviewLink
    {
        $options = array_merge($this->options, $options ?? []);
        $options['maxRetries'] = 0;
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/workspaces/{$workspaceId}/posts/{$postId}/review-links",
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
                return CreatedReviewLink::fromJson($json);
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
     * Ends a review link at once: whoever opens it is told it was revoked. Needs post:approve, and is refused to staff acting as a member.
     *
     * Example:
     * ```php
     * $client->review->revokeLink(
     *     'workspaceId',
     *     'linkId',
     * );
     * ```
     *
     * @param string $workspaceId
     * @param string $linkId
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?ReviewLink
     * @throws PealException
     * @throws PealApiException
     */
    public function revokeLink(string $workspaceId, string $linkId, ?array $options = null): ?ReviewLink
    {
        $options = array_merge($this->options, $options ?? []);
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/workspaces/{$workspaceId}/review-links/{$linkId}",
                    method: HttpMethod::DELETE,
                ),
                $options,
            );
            $statusCode = $response->getStatusCode();
            if ($statusCode >= 200 && $statusCode < 400) {
                $json = $response->getBody()->getContents();
                if (empty($json)) {
                    return null;
                }
                return ReviewLink::fromJson($json);
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
