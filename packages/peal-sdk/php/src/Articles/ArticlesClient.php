<?php

namespace Peal\Articles;

use Psr\Http\Client\ClientInterface;
use Peal\Core\Client\RawClient;
use Peal\Articles\Requests\ListArticlesRequest;
use Peal\Types\ArticlePage;
use Peal\Exceptions\PealException;
use Peal\Exceptions\PealApiException;
use Peal\Core\Json\JsonApiRequest;
use Peal\Environments;
use Peal\Core\Client\HttpMethod;
use JsonException;
use Psr\Http\Client\ClientExceptionInterface;
use Peal\Articles\Requests\NewArticle;
use Peal\Types\Article;
use Peal\Articles\Requests\UpdateArticlesRequest;
use Peal\Articles\Requests\ScheduleArticlesRequest;
use Peal\Articles\Requests\UpdateOnSiteArticlesRequest;

class ArticlesClient
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
     * Lists the workspace's articles, newest first, 50 a page unless `limit` (at most 100) says otherwise, those in one `status` when it is given. Pass the page's `nextCursor` as `cursor` for the next. Needs post:read.
     *
     * Example:
     * ```php
     * $client->articles->list(
     *     'workspaceId',
     *     new ListArticlesRequest([]),
     * );
     * ```
     *
     * @param string $workspaceId
     * @param ListArticlesRequest $request
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?ArticlePage
     * @throws PealException
     * @throws PealApiException
     */
    public function list(string $workspaceId, ListArticlesRequest $request = new ListArticlesRequest(), ?array $options = null): ?ArticlePage
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
                    path: "api/workspaces/{$workspaceId}/articles",
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
                return ArticlePage::fromJson($json);
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
     * Writes an article for one of the workspace's websites (a channel connected with connectSite): a draft, or scheduled at once with `schedule`. A scheduled article is checked as the site would take it (ArticleRejected lists every violation); its images are files of the workspace's library, ready (UnknownMedia otherwise), the cover an image. Refused (ArticleRejected `approvalRequired`) while your posts need an approval, which articles cannot have yet, and (PlanLimitReached) while the workspace holds more channels or members than its plan allows. Needs post:create, and post:schedule with `schedule`.
     *
     * Example:
     * ```php
     * $client->articles->create(
     *     'workspaceId',
     *     new NewArticle([
     *         'body' => new ArticleBody([
     *             'content' => [],
     *             'type' => ArticleBodyType::Doc->value,
     *         ]),
     *         'title' => 'title',
     *         'channelId' => 'channelId',
     *     ]),
     * );
     * ```
     *
     * @param string $workspaceId
     * @param NewArticle $request
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?Article
     * @throws PealException
     * @throws PealApiException
     */
    public function create(string $workspaceId, NewArticle $request, ?array $options = null): ?Article
    {
        $options = array_merge($this->options, $options ?? []);
        $options['maxRetries'] = 0;
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/workspaces/{$workspaceId}/articles",
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
                return Article::fromJson($json);
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
     * Reads an article. Needs post:read.
     *
     * Example:
     * ```php
     * $client->articles->get(
     *     'workspaceId',
     *     'articleId',
     * );
     * ```
     *
     * @param string $workspaceId
     * @param string $articleId
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?Article
     * @throws PealException
     * @throws PealApiException
     */
    public function get(string $workspaceId, string $articleId, ?array $options = null): ?Article
    {
        $options = array_merge($this->options, $options ?? []);
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/workspaces/{$workspaceId}/articles/{$articleId}",
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
                return Article::fromJson($json);
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
     * Deletes the article from Peal, and its job when it waits to go out; never while it is being sent. A post already on the site stays there: unpublish it first. Needs post:delete.
     *
     * Example:
     * ```php
     * $client->articles->delete(
     *     'workspaceId',
     *     'articleId',
     * );
     * ```
     *
     * @param string $workspaceId
     * @param string $articleId
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
    public function delete(string $workspaceId, string $articleId, ?array $options = null): void
    {
        $options = array_merge($this->options, $options ?? []);
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/workspaces/{$workspaceId}/articles/{$articleId}",
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
     * Replaces what a draft, a scheduled article or one that failed says. A scheduled article is checked again and keeps its time; it is refused (ArticleRejected `approvalRequired`) while your posts need an approval. Once on the site, use updateOnSite. Needs post:update.
     *
     * Example:
     * ```php
     * $client->articles->update(
     *     'workspaceId',
     *     'articleId',
     *     new UpdateArticlesRequest([
     *         'body' => new ArticleInput([
     *             'body' => new ArticleBody([
     *                 'content' => [],
     *                 'type' => ArticleBodyType::Doc->value,
     *             ]),
     *             'title' => 'title',
     *         ]),
     *     ]),
     * );
     * ```
     *
     * @param string $workspaceId
     * @param string $articleId
     * @param UpdateArticlesRequest $request
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?Article
     * @throws PealException
     * @throws PealApiException
     */
    public function update(string $workspaceId, string $articleId, UpdateArticlesRequest $request, ?array $options = null): ?Article
    {
        $options = array_merge($this->options, $options ?? []);
        $options['maxRetries'] = 0;
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/workspaces/{$workspaceId}/articles/{$articleId}",
                    method: HttpMethod::PATCH,
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
                return Article::fromJson($json);
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
     * Schedules a draft, moves a scheduled article, or schedules one that failed again: Peal sends it at `at`, or now without it, and the site makes it what `siteStatus` says. With `future`, the site publishes it at `at`, which must be ahead, and Peal sends it at once. Everything is checked as the site would take it. What goes out is public, and cannot be taken back from Peal but by unpublishing it. Refused (ArticleRejected `approvalRequired`) while your posts need an approval, which articles cannot have yet, and (PlanLimitReached) while the workspace holds more channels or members than its plan allows. Needs post:schedule.
     *
     * Example:
     * ```php
     * $client->articles->schedule(
     *     'workspaceId',
     *     'articleId',
     *     new ScheduleArticlesRequest([
     *         'body' => new ArticleTime([
     *             'timeZone' => 'timeZone',
     *         ]),
     *     ]),
     * );
     * ```
     *
     * @param string $workspaceId
     * @param string $articleId
     * @param ScheduleArticlesRequest $request
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?Article
     * @throws PealException
     * @throws PealApiException
     */
    public function schedule(string $workspaceId, string $articleId, ScheduleArticlesRequest $request, ?array $options = null): ?Article
    {
        $options = array_merge($this->options, $options ?? []);
        $options['maxRetries'] = 0;
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/workspaces/{$workspaceId}/articles/{$articleId}/schedule",
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
                return Article::fromJson($json);
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
     * Takes a scheduled article back to draft: nothing is sent. Needs post:schedule.
     *
     * Example:
     * ```php
     * $client->articles->unschedule(
     *     'workspaceId',
     *     'articleId',
     * );
     * ```
     *
     * @param string $workspaceId
     * @param string $articleId
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?Article
     * @throws PealException
     * @throws PealApiException
     */
    public function unschedule(string $workspaceId, string $articleId, ?array $options = null): ?Article
    {
        $options = array_merge($this->options, $options ?? []);
        $options['maxRetries'] = 0;
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/workspaces/{$workspaceId}/articles/{$articleId}/unschedule",
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
                return Article::fromJson($json);
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
     * Sends a failed article again now, or one that was unconfirmed once a member checked it is not on the site: Peal never sends an unconfirmed article again on its own. Refused (ArticleRejected `approvalRequired`) while your posts need an approval, which articles cannot have yet, and (PlanLimitReached) while the workspace holds more channels or members than its plan allows. Needs post:schedule.
     *
     * Example:
     * ```php
     * $client->articles->retry(
     *     'workspaceId',
     *     'articleId',
     * );
     * ```
     *
     * @param string $workspaceId
     * @param string $articleId
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?Article
     * @throws PealException
     * @throws PealApiException
     */
    public function retry(string $workspaceId, string $articleId, ?array $options = null): ?Article
    {
        $options = array_merge($this->options, $options ?? []);
        $options['maxRetries'] = 0;
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/workspaces/{$workspaceId}/articles/{$articleId}/retry",
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
                return Article::fromJson($json);
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
     * Moves the article's post to the site's trash, where the site keeps it for a while (30 days by default on WordPress) before deleting it; it stays published in Peal, with `removedAt`. Needs post:publish; an OAuth client needs the scope workspace:publish.
     *
     * Example:
     * ```php
     * $client->articles->unpublish(
     *     'workspaceId',
     *     'articleId',
     * );
     * ```
     *
     * @param string $workspaceId
     * @param string $articleId
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?Article
     * @throws PealException
     * @throws PealApiException
     */
    public function unpublish(string $workspaceId, string $articleId, ?array $options = null): ?Article
    {
        $options = array_merge($this->options, $options ?? []);
        $options['maxRetries'] = 0;
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/workspaces/{$workspaceId}/articles/{$articleId}/unpublish",
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
                return Article::fromJson($json);
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
     * Replaces what the article's post says on the site (title, body, excerpt, tags, categories, cover), at once: the site keeps its status and its date, and files it has already are not sent again; a cover or an excerpt removed is removed there. Refused (ArticleRejected `approvalRequired`) while your posts need an approval, which articles cannot have yet, and (PlanLimitReached) while the workspace holds more channels or members than its plan allows. Needs post:publish; an OAuth client needs the scope workspace:publish.
     *
     * Example:
     * ```php
     * $client->articles->updateOnSite(
     *     'workspaceId',
     *     'articleId',
     *     new UpdateOnSiteArticlesRequest([
     *         'body' => new ArticleInput([
     *             'body' => new ArticleBody([
     *                 'content' => [],
     *                 'type' => ArticleBodyType::Doc->value,
     *             ]),
     *             'title' => 'title',
     *         ]),
     *     ]),
     * );
     * ```
     *
     * @param string $workspaceId
     * @param string $articleId
     * @param UpdateOnSiteArticlesRequest $request
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?Article
     * @throws PealException
     * @throws PealApiException
     */
    public function updateOnSite(string $workspaceId, string $articleId, UpdateOnSiteArticlesRequest $request, ?array $options = null): ?Article
    {
        $options = array_merge($this->options, $options ?? []);
        $options['maxRetries'] = 0;
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/workspaces/{$workspaceId}/articles/{$articleId}/site",
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
                return Article::fromJson($json);
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
