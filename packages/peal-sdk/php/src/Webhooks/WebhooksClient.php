<?php

namespace Peal\Webhooks;

use Psr\Http\Client\ClientInterface;
use Peal\Core\Client\RawClient;
use Peal\Types\WebhookEndpoint;
use Peal\Exceptions\PealException;
use Peal\Exceptions\PealApiException;
use Peal\Core\Json\JsonApiRequest;
use Peal\Environments;
use Peal\Core\Client\HttpMethod;
use Peal\Core\Json\JsonDecoder;
use JsonException;
use Psr\Http\Client\ClientExceptionInterface;
use Peal\Webhooks\Requests\NewWebhookEndpoint;
use Peal\Types\WebhookEndpointSecret;
use Peal\Webhooks\Requests\SearchDeliveriesWebhooksRequest;
use Peal\Types\WebhookDeliveryPage;
use Peal\Webhooks\Requests\RedeliverManyWebhooksRequest;
use Peal\Types\WebhookBulkRedelivery;
use Peal\Webhooks\Requests\WebhookEndpointChange;
use Peal\Webhooks\Requests\SendTestWebhooksRequest;
use Peal\Types\WebhookDelivery;
use Peal\Webhooks\Requests\ListDeliveriesWebhooksRequest;

class WebhooksClient
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
     * Lists the workspace's webhook endpoints, oldest first. Needs webhook:read.
     *
     * Example:
     * ```php
     * $client->webhooks->list(
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
     * @return ?array<WebhookEndpoint>
     * @throws PealException
     * @throws PealApiException
     */
    public function list(string $workspaceId, ?array $options = null): ?array
    {
        $options = array_merge($this->options, $options ?? []);
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/workspaces/{$workspaceId}/webhooks",
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
                return JsonDecoder::decodeArray($json, [WebhookEndpoint::class]); // @phpstan-ignore-line
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
     * Adds a webhook endpoint to the workspace, and answers with its signing secret, which is not shown again. Its address must be HTTPS on the default port, on a public host, without credentials; Peal follows no redirect from it. A workspace has 10 endpoints at most, whatever its plan. With `scope` `partner`, in the home workspace of a partner account, the endpoint also hears what happens in every workspace the partner owns, each event naming its workspace and carrying the partner's own id for it (`workspaceExternalId`); any other workspace answers 404 `PartnerNotFound`. `channelIds` (50 at most) narrows it to the events about those channels: an event of one channel when it is listed, an event of a whole post when one of its channels is, and an event about no channel (a file, a boost) whatever it lists; leave such types out of `eventTypes` when they are not wanted. `workspaceIds` (200 at most), on a `partner` endpoint only, narrows it to those workspaces, the home workspace only if listed. Ids are checked for their shape only: one that names nothing matches nothing, and a filter stays as saved when what it names is gone. Filters apply when each event happens. `headers` (5 at most) go with every delivery beside Peal's own, which they never replace, for a gateway in front of the receiver that wants a token: a name is an HTTP token, once whatever its case, neither `host`, `user-agent`, `cookie`, `expect`, `accept-encoding`, a connection's own, nor any `content-` or `webhook-` name; a value is visible ASCII on one line, 1024 characters at most. Values are write-only: the endpoint shows their names (`headerNames`), never them, and sends them only to the origin (scheme, host and port) of the `url` they were given with. The signature does not cover them. Needs webhook:manage.
     *
     * Example:
     * ```php
     * $client->webhooks->create(
     *     'workspaceId',
     *     new NewWebhookEndpoint([
     *         'eventTypes' => [
     *             SubscribableWebhookEventType::PostScheduled->value,
     *         ],
     *         'url' => 'url',
     *     ]),
     * );
     * ```
     *
     * @param string $workspaceId
     * @param NewWebhookEndpoint $request
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?WebhookEndpointSecret
     * @throws PealException
     * @throws PealApiException
     */
    public function create(string $workspaceId, NewWebhookEndpoint $request, ?array $options = null): ?WebhookEndpointSecret
    {
        $options = array_merge($this->options, $options ?? []);
        $options['maxRetries'] = 0;
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/workspaces/{$workspaceId}/webhooks",
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
                return WebhookEndpointSecret::fromJson($json);
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
     * Lists the workspace's deliveries across its endpoints, newest first, 30 a page unless `limit` (at most 100) says otherwise, filtered by `status`, `endpointId`, `eventType`, and when they were made: `since` (included) and `until` (excluded). The deliveries of a `partner` endpoint include those of the partner's other workspaces, each naming its workspace (`workspaceId`, `workspaceExternalId`). A delivery that failed for good (`failed`) stays 30 days, with the receiver's last answer: send it again with `POST …/webhooks/deliveries/redeliver`. Pass the page's `nextCursor` as `cursor` for the next one. Needs webhook:read.
     *
     * Example:
     * ```php
     * $client->webhooks->searchDeliveries(
     *     'workspaceId',
     *     new SearchDeliveriesWebhooksRequest([]),
     * );
     * ```
     *
     * @param string $workspaceId
     * @param SearchDeliveriesWebhooksRequest $request
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?WebhookDeliveryPage
     * @throws PealException
     * @throws PealApiException
     */
    public function searchDeliveries(string $workspaceId, SearchDeliveriesWebhooksRequest $request = new SearchDeliveriesWebhooksRequest(), ?array $options = null): ?WebhookDeliveryPage
    {
        $options = array_merge($this->options, $options ?? []);
        $query = [];
        if ($request->cursor != null) {
            $query['cursor'] = $request->cursor;
        }
        if ($request->limit != null) {
            $query['limit'] = $request->limit;
        }
        if ($request->eventType != null) {
            $query['eventType'] = $request->eventType;
        }
        if ($request->status != null) {
            $query['status'] = $request->status;
        }
        if ($request->endpointId != null) {
            $query['endpointId'] = $request->endpointId;
        }
        if ($request->since != null) {
            $query['since'] = $request->since;
        }
        if ($request->until != null) {
            $query['until'] = $request->until;
        }
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/workspaces/{$workspaceId}/webhooks/deliveries",
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
                return WebhookDeliveryPage::fromJson($json);
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
     * Sends many deliveries again, 100 a call at most: those named by `deliveryIds`, or the failed deliveries of the endpoint `endpointId` (made from `since`, before `until`, of `eventType`, each left out for any), oldest first, the last of each event only. Each goes to its own endpoint whatever the endpoint's filters are now, as a new delivery of the same event: the same `webhook-id` and body, signed anew. A delivery is skipped when its endpoint is off, when it is not the workspace's, and when its event was sent again since and that delivery is pending or went through, so calling again after a partial run sends nothing twice; `remaining` says how many more failed deliveries the selection holds. The new deliveries of an endpoint start a quarter of a second apart. A workspace sends 1000 deliveries again this way an hour, apart from the test events and single sends: a call that would pass it sends nothing (429 `TooManyWebhookSends`). Needs webhook:manage.
     *
     * Example:
     * ```php
     * $client->webhooks->redeliverMany(
     *     'workspaceId',
     *     new RedeliverManyWebhooksRequest([
     *         'body' => new WebhookRedeliveryByIds([
     *             'deliveryIds' => [
     *                 'deliveryIds',
     *             ],
     *         ]),
     *     ]),
     * );
     * ```
     *
     * @param string $workspaceId
     * @param RedeliverManyWebhooksRequest $request
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?WebhookBulkRedelivery
     * @throws PealException
     * @throws PealApiException
     */
    public function redeliverMany(string $workspaceId, RedeliverManyWebhooksRequest $request, ?array $options = null): ?WebhookBulkRedelivery
    {
        $options = array_merge($this->options, $options ?? []);
        $options['maxRetries'] = 0;
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/workspaces/{$workspaceId}/webhooks/deliveries/redeliver",
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
                return WebhookBulkRedelivery::fromJson($json);
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
     * Shows one of the workspace's webhook endpoints. Needs webhook:read.
     *
     * Example:
     * ```php
     * $client->webhooks->get(
     *     'workspaceId',
     *     'endpointId',
     * );
     * ```
     *
     * @param string $workspaceId
     * @param string $endpointId
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?WebhookEndpoint
     * @throws PealException
     * @throws PealApiException
     */
    public function get(string $workspaceId, string $endpointId, ?array $options = null): ?WebhookEndpoint
    {
        $options = array_merge($this->options, $options ?? []);
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/workspaces/{$workspaceId}/webhooks/{$endpointId}",
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
                return WebhookEndpoint::fromJson($json);
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
     * Deletes an endpoint, its secret and its delivery log: nothing more is sent to it. Needs webhook:manage.
     *
     * Example:
     * ```php
     * $client->webhooks->delete(
     *     'workspaceId',
     *     'endpointId',
     * );
     * ```
     *
     * @param string $workspaceId
     * @param string $endpointId
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
    public function delete(string $workspaceId, string $endpointId, ?array $options = null): void
    {
        $options = array_merge($this->options, $options ?? []);
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/workspaces/{$workspaceId}/webhooks/{$endpointId}",
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
     * Changes an endpoint's address, description, events, filters or headers, or turns it off or back on: what is left out stays as it is, and an empty filter hears everything again; `workspaceIds` is for an endpoint of the `partner` scope only (422 `WebhookFilterRefused`). `headers` replaces every header it had, `[]` removing them all: a header given without `value` keeps the value it has under that name, as none is ever shown, and one it does not have needs a value. A value is sent only to the origin (scheme, host and port) it was given for: a new `url` on another origin, on an endpoint with headers, needs `headers` in the same request, each with its `value`, or `[]` (422 `WebhookHeaderValuesRequired`). Filters apply to the events that happen after the change. Turned off, it is sent nothing, its pending deliveries fail, and events that happen meanwhile are not kept for it. Turning it back on forgets the failures that turned it off. Needs webhook:manage.
     *
     * Example:
     * ```php
     * $client->webhooks->update(
     *     'workspaceId',
     *     'endpointId',
     *     new WebhookEndpointChange([]),
     * );
     * ```
     *
     * @param string $workspaceId
     * @param string $endpointId
     * @param WebhookEndpointChange $request
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?WebhookEndpoint
     * @throws PealException
     * @throws PealApiException
     */
    public function update(string $workspaceId, string $endpointId, WebhookEndpointChange $request = new WebhookEndpointChange(), ?array $options = null): ?WebhookEndpoint
    {
        $options = array_merge($this->options, $options ?? []);
        $options['maxRetries'] = 0;
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/workspaces/{$workspaceId}/webhooks/{$endpointId}",
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
                return WebhookEndpoint::fromJson($json);
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
     * Replaces an endpoint's signing secret, and answers with the new one, which is not shown again. For 24 hours each delivery carries two signatures, one per secret, so the receiver changes its own without missing any; the old one then signs nothing more. Needs webhook:manage.
     *
     * Example:
     * ```php
     * $client->webhooks->rotateSecret(
     *     'workspaceId',
     *     'endpointId',
     * );
     * ```
     *
     * @param string $workspaceId
     * @param string $endpointId
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?WebhookEndpointSecret
     * @throws PealException
     * @throws PealApiException
     */
    public function rotateSecret(string $workspaceId, string $endpointId, ?array $options = null): ?WebhookEndpointSecret
    {
        $options = array_merge($this->options, $options ?? []);
        $options['maxRetries'] = 0;
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/workspaces/{$workspaceId}/webhooks/{$endpointId}/secret",
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
                return WebhookEndpointSecret::fromJson($json);
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
     * Sends the endpoint a `webhook.test` event, or, with `eventType`, a sample of that type: its real shape, with ids that name nothing, the workspace's own id and `sample: true`, which the receiver must never act on. Either goes whatever the endpoint subscribes to or filters. It answers with the delivery, still pending: read the endpoint's deliveries to see how it ended. A workspace sends 30 test events and deliveries again an hour at most (429 `TooManyWebhookSends`). Needs webhook:manage.
     *
     * Example:
     * ```php
     * $client->webhooks->sendTest(
     *     'workspaceId',
     *     'endpointId',
     *     new SendTestWebhooksRequest([]),
     * );
     * ```
     *
     * @param string $workspaceId
     * @param string $endpointId
     * @param SendTestWebhooksRequest $request
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?WebhookDelivery
     * @throws PealException
     * @throws PealApiException
     */
    public function sendTest(string $workspaceId, string $endpointId, SendTestWebhooksRequest $request = new SendTestWebhooksRequest(), ?array $options = null): ?WebhookDelivery
    {
        $options = array_merge($this->options, $options ?? []);
        $options['maxRetries'] = 0;
        $query = [];
        if ($request->eventType != null) {
            $query['eventType'] = $request->eventType;
        }
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/workspaces/{$workspaceId}/webhooks/{$endpointId}/test",
                    method: HttpMethod::POST,
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
                return WebhookDelivery::fromJson($json);
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
     * Lists the endpoint's deliveries, newest first, of a `status` and an `eventType` when given, 30 a page unless `limit` (at most 100) says otherwise: each one's status, the receiver's last answer, how many attempts were made and when the next one is. Pass the page's `nextCursor` as `cursor` for the next one. A delivery is kept 30 days. Needs webhook:read.
     *
     * Example:
     * ```php
     * $client->webhooks->listDeliveries(
     *     'workspaceId',
     *     'endpointId',
     *     new ListDeliveriesWebhooksRequest([]),
     * );
     * ```
     *
     * @param string $workspaceId
     * @param string $endpointId
     * @param ListDeliveriesWebhooksRequest $request
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?WebhookDeliveryPage
     * @throws PealException
     * @throws PealApiException
     */
    public function listDeliveries(string $workspaceId, string $endpointId, ListDeliveriesWebhooksRequest $request = new ListDeliveriesWebhooksRequest(), ?array $options = null): ?WebhookDeliveryPage
    {
        $options = array_merge($this->options, $options ?? []);
        $query = [];
        if ($request->cursor != null) {
            $query['cursor'] = $request->cursor;
        }
        if ($request->limit != null) {
            $query['limit'] = $request->limit;
        }
        if ($request->eventType != null) {
            $query['eventType'] = $request->eventType;
        }
        if ($request->status != null) {
            $query['status'] = $request->status;
        }
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/workspaces/{$workspaceId}/webhooks/{$endpointId}/deliveries",
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
                return WebhookDeliveryPage::fromJson($json);
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
     * Sends the delivery's event to the endpoint again, as a new delivery of the same event: the receiver gets the same `webhook-id` and body, with a new timestamp and signature. A workspace sends 30 test events and deliveries again an hour at most (429 `TooManyWebhookSends`). Needs webhook:manage.
     *
     * Example:
     * ```php
     * $client->webhooks->redeliver(
     *     'workspaceId',
     *     'endpointId',
     *     'deliveryId',
     * );
     * ```
     *
     * @param string $workspaceId
     * @param string $endpointId
     * @param string $deliveryId
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?WebhookDelivery
     * @throws PealException
     * @throws PealApiException
     */
    public function redeliver(string $workspaceId, string $endpointId, string $deliveryId, ?array $options = null): ?WebhookDelivery
    {
        $options = array_merge($this->options, $options ?? []);
        $options['maxRetries'] = 0;
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/workspaces/{$workspaceId}/webhooks/{$endpointId}/deliveries/{$deliveryId}/redeliver",
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
                return WebhookDelivery::fromJson($json);
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
