<?php

namespace Peal\Ads;

use Psr\Http\Client\ClientInterface;
use Peal\Core\Client\RawClient;
use Peal\Types\AdsStatus;
use Peal\Exceptions\PealException;
use Peal\Exceptions\PealApiException;
use Peal\Core\Json\JsonApiRequest;
use Peal\Environments;
use Peal\Core\Client\HttpMethod;
use JsonException;
use Psr\Http\Client\ClientExceptionInterface;
use Peal\Types\AdConnection;
use Peal\Core\Json\JsonDecoder;
use Peal\Types\AdNetwork;
use Peal\Types\AdSignIn;
use Peal\Ads\Requests\AdSignInCallback;
use Peal\Types\AdSignInResult;
use Peal\Types\ReachableAdAccount;
use Peal\Ads\Requests\AdAccountsToConnect;
use Peal\Types\AdAccount;
use Peal\Types\AdSpending;
use Peal\Ads\Requests\AdSpendingDecision;
use Peal\Ads\Requests\ListCampaignsAdsRequest;
use Peal\Types\AdCampaignReport;
use Peal\Ads\Requests\ListAdsAdsRequest;
use Peal\Types\AdReport;
use Peal\Ads\Requests\ListInsightsAdsRequest;
use Peal\Types\AdInsightReport;
use Peal\Types\PostAdPerformance;
use Peal\Ads\Requests\QuoteBoostAdsRequest;
use Peal\Types\BoostQuote;
use Peal\Ads\Requests\ListBoostsAdsRequest;
use Peal\Types\BoostPage;
use Peal\Ads\Requests\CreateBoostAdsRequest;
use Peal\Types\Boost;
use Peal\Types\BoostDetail;
use Peal\Ads\Requests\AuditTrailAdsRequest;
use Peal\Types\AdAuditPage;

class AdsClient
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
     * Says what this server offers of ads (`off`, `read` or `spend`) and on which networks. Needs ads:read.
     *
     * Example:
     * ```php
     * $client->ads->status(
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
     * @return ?AdsStatus
     * @throws PealException
     * @throws PealApiException
     */
    public function status(string $workspaceId, ?array $options = null): ?AdsStatus
    {
        $options = array_merge($this->options, $options ?? []);
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/workspaces/{$workspaceId}/ads",
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
                return AdsStatus::fromJson($json);
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
     * Lists the workspace's sign-ins to ad networks, oldest first: who signed in, whether the network still takes the sign-in, and whether it may run ads. Never a token. Needs ads:read.
     *
     * Example:
     * ```php
     * $client->ads->listConnections(
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
     * @return ?array<AdConnection>
     * @throws PealException
     * @throws PealApiException
     */
    public function listConnections(string $workspaceId, ?array $options = null): ?array
    {
        $options = array_merge($this->options, $options ?? []);
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/workspaces/{$workspaceId}/ads/connections",
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
                return JsonDecoder::decodeArray($json, [AdConnection::class]); // @phpstan-ignore-line
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
     * Starts a sign-in to an ad network and answers the page to send the member's browser to. The sign-in asks for reading only on a server that offers no spending. Only a person does this, signed in to Peal in their own session, who manages ad accounts (ads:manage): never an API key, an application or staff acting as them.
     *
     * Example:
     * ```php
     * $client->ads->connect(
     *     'workspaceId',
     *     AdNetwork::Meta->value,
     * );
     * ```
     *
     * @param string $workspaceId
     * @param value-of<AdNetwork> $network
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?AdSignIn
     * @throws PealException
     * @throws PealApiException
     */
    public function connect(string $workspaceId, string $network, ?array $options = null): ?AdSignIn
    {
        $options = array_merge($this->options, $options ?? []);
        $options['maxRetries'] = 0;
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/workspaces/{$workspaceId}/ads/connections/{$network}",
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
                return AdSignIn::fromJson($json);
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
     * Completes a sign-in with what the network's page sent back, and answers the ad accounts it reaches. Nothing is connected yet: `connectAccounts` connects those chosen. A sign-in is completed once, within 15 minutes, by who started it. Needs ads:manage, in person.
     *
     * Example:
     * ```php
     * $client->ads->completeConnect(
     *     'workspaceId',
     *     AdNetwork::Meta->value,
     *     new AdSignInCallback([
     *         'state' => 'state',
     *     ]),
     * );
     * ```
     *
     * @param string $workspaceId
     * @param value-of<AdNetwork> $network
     * @param AdSignInCallback $request
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?AdSignInResult
     * @throws PealException
     * @throws PealApiException
     */
    public function completeConnect(string $workspaceId, string $network, AdSignInCallback $request, ?array $options = null): ?AdSignInResult
    {
        $options = array_merge($this->options, $options ?? []);
        $options['maxRetries'] = 0;
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/workspaces/{$workspaceId}/ads/connections/{$network}/callback",
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
                return AdSignInResult::fromJson($json);
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
     * Lists the ad accounts a sign-in reaches now, as the network gives them: currency, time zone, status and spend cap, and whether the workspace already connects each. Only who signed in reads it (ads:manage, in person).
     *
     * Example:
     * ```php
     * $client->ads->reachableAccounts(
     *     'workspaceId',
     *     'connectionId',
     * );
     * ```
     *
     * @param string $workspaceId
     * @param string $connectionId
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?array<ReachableAdAccount>
     * @throws PealException
     * @throws PealApiException
     */
    public function reachableAccounts(string $workspaceId, string $connectionId, ?array $options = null): ?array
    {
        $options = array_merge($this->options, $options ?? []);
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/workspaces/{$workspaceId}/ads/connections/{$connectionId}/accounts",
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
                return JsonDecoder::decodeArray($json, [ReachableAdAccount::class]); // @phpstan-ignore-line
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
     * Connects some of the ad accounts a sign-in reaches, 25 at most, by the ids the network gives them. The network is asked again which accounts the sign-in reaches: one it does not reach is `AdAccountNotFound`, and nothing is connected. An account connected before stays as it is. Spending is off on every new account until an owner turns it on. Only who signed in does this (ads:manage, in person).
     *
     * Example:
     * ```php
     * $client->ads->connectAccounts(
     *     'workspaceId',
     *     'connectionId',
     *     new AdAccountsToConnect([
     *         'externalIds' => [
     *             'externalIds',
     *         ],
     *     ]),
     * );
     * ```
     *
     * @param string $workspaceId
     * @param string $connectionId
     * @param AdAccountsToConnect $request
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?array<AdAccount>
     * @throws PealException
     * @throws PealApiException
     */
    public function connectAccounts(string $workspaceId, string $connectionId, AdAccountsToConnect $request, ?array $options = null): ?array
    {
        $options = array_merge($this->options, $options ?? []);
        $options['maxRetries'] = 0;
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/workspaces/{$workspaceId}/ads/connections/{$connectionId}/accounts",
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
                return JsonDecoder::decodeArray($json, [AdAccount::class]); // @phpstan-ignore-line
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
     * Removes a sign-in, its token, the ad accounts it connects and what was read of them; their boosts' records stay with the workspace, and what they committed still counts once the same account is connected again. Refused while one of their boosts runs, may run, is paused or is being made (`AdAccountBusy`): stop them first. What runs at the network that Peal did not make is left as it is. Needs ads:manage.
     *
     * Example:
     * ```php
     * $client->ads->disconnect(
     *     'workspaceId',
     *     'connectionId',
     * );
     * ```
     *
     * @param string $workspaceId
     * @param string $connectionId
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
    public function disconnect(string $workspaceId, string $connectionId, ?array $options = null): void
    {
        $options = array_merge($this->options, $options ?? []);
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/workspaces/{$workspaceId}/ads/connections/{$connectionId}",
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
     * Lists the workspace's connected ad accounts, oldest first, with whether each may spend through Peal and its monthly ceiling. Needs ads:read.
     *
     * Example:
     * ```php
     * $client->ads->listAccounts(
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
     * @return ?array<AdAccount>
     * @throws PealException
     * @throws PealApiException
     */
    public function listAccounts(string $workspaceId, ?array $options = null): ?array
    {
        $options = array_merge($this->options, $options ?? []);
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/workspaces/{$workspaceId}/ads/accounts",
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
                return JsonDecoder::decodeArray($json, [AdAccount::class]); // @phpstan-ignore-line
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
     * Shows an ad account with what its boosts made through Peal commit in the current calendar month of its time zone. Needs ads:read.
     *
     * Example:
     * ```php
     * $client->ads->getAccount(
     *     'workspaceId',
     *     'accountId',
     * );
     * ```
     *
     * @param string $workspaceId
     * @param string $accountId
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?AdSpending
     * @throws PealException
     * @throws PealApiException
     */
    public function getAccount(string $workspaceId, string $accountId, ?array $options = null): ?AdSpending
    {
        $options = array_merge($this->options, $options ?? []);
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/workspaces/{$workspaceId}/ads/accounts/{$accountId}",
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
                return AdSpending::fromJson($json);
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
     * Disconnects an ad account: what was read of it goes with it, and its boosts' records stay with the workspace, so what they committed still counts against the ceiling once the same account is connected again. Refused while one of its boosts runs, may run, is paused or is being made (`AdAccountBusy`), as a paused campaign may run again. Needs ads:manage.
     *
     * Example:
     * ```php
     * $client->ads->removeAccount(
     *     'workspaceId',
     *     'accountId',
     * );
     * ```
     *
     * @param string $workspaceId
     * @param string $accountId
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
    public function removeAccount(string $workspaceId, string $accountId, ?array $options = null): void
    {
        $options = array_merge($this->options, $options ?? []);
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/workspaces/{$workspaceId}/ads/accounts/{$accountId}",
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
     * Decides whether an ad account may spend through Peal, and how much: `enabled` with a `monthlyCeiling` in the account's currency, the most its boosts may commit in one calendar month of its time zone. A ceiling may always be lowered, under running boosts too: they run on, and nothing new starts or resumes until there is room. Turning spending off is refused while a boost runs or may run (`AdAccountBusy`). Only an owner does this, signed in to Peal in their own session (ads:authorize): never an admin, an API key, an application or staff acting as an owner. Peal never turns spending on or raises a ceiling on its own.
     *
     * Example:
     * ```php
     * $client->ads->setSpending(
     *     'workspaceId',
     *     'accountId',
     *     new AdSpendingDecision([
     *         'enabled' => true,
     *     ]),
     * );
     * ```
     *
     * @param string $workspaceId
     * @param string $accountId
     * @param AdSpendingDecision $request
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?AdSpending
     * @throws PealException
     * @throws PealApiException
     */
    public function setSpending(string $workspaceId, string $accountId, AdSpendingDecision $request, ?array $options = null): ?AdSpending
    {
        $options = array_merge($this->options, $options ?? []);
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/workspaces/{$workspaceId}/ads/accounts/{$accountId}/spending",
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
                return AdSpending::fromJson($json);
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
     * Lists an ad account's campaigns as last read from its network (every hour), those made outside Peal included, with what their ads did over the days `from` to `to` of the account's calendar, both included and at most 366 days: the last 30 when left out. A thousand at most. Needs ads:read.
     *
     * Example:
     * ```php
     * $client->ads->listCampaigns(
     *     'workspaceId',
     *     'accountId',
     *     new ListCampaignsAdsRequest([]),
     * );
     * ```
     *
     * @param string $workspaceId
     * @param string $accountId
     * @param ListCampaignsAdsRequest $request
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?AdCampaignReport
     * @throws PealException
     * @throws PealApiException
     */
    public function listCampaigns(string $workspaceId, string $accountId, ListCampaignsAdsRequest $request = new ListCampaignsAdsRequest(), ?array $options = null): ?AdCampaignReport
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
                    path: "api/workspaces/{$workspaceId}/ads/accounts/{$accountId}/campaigns",
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
                return AdCampaignReport::fromJson($json);
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
     * Lists an ad account's ads as last read, those of one campaign with `campaignId` (the network's id), each with the workspace's own post it promotes when it is one, and what it did over the days `from` to `to` of the account's calendar, both included and at most 366 days: the last 30 when left out. A thousand at most. Needs ads:read.
     *
     * Example:
     * ```php
     * $client->ads->listAds(
     *     'workspaceId',
     *     'accountId',
     *     new ListAdsAdsRequest([]),
     * );
     * ```
     *
     * @param string $workspaceId
     * @param string $accountId
     * @param ListAdsAdsRequest $request
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?AdReport
     * @throws PealException
     * @throws PealApiException
     */
    public function listAds(string $workspaceId, string $accountId, ListAdsAdsRequest $request = new ListAdsAdsRequest(), ?array $options = null): ?AdReport
    {
        $options = array_merge($this->options, $options ?? []);
        $query = [];
        if ($request->from != null) {
            $query['from'] = $request->from;
        }
        if ($request->to != null) {
            $query['to'] = $request->to;
        }
        if ($request->campaignId != null) {
            $query['campaignId'] = $request->campaignId;
        }
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/workspaces/{$workspaceId}/ads/accounts/{$accountId}/ads",
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
                return AdReport::fromJson($json);
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
     * Sums what an ad account's ads did each day: spend, impressions, reach, clicks and results, over the days `from` to `to` of the account's calendar, both included and at most 366 days: the last 30 when left out. A day is kept 396 days. Needs ads:read.
     *
     * Example:
     * ```php
     * $client->ads->listInsights(
     *     'workspaceId',
     *     'accountId',
     *     new ListInsightsAdsRequest([]),
     * );
     * ```
     *
     * @param string $workspaceId
     * @param string $accountId
     * @param ListInsightsAdsRequest $request
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?AdInsightReport
     * @throws PealException
     * @throws PealApiException
     */
    public function listInsights(string $workspaceId, string $accountId, ListInsightsAdsRequest $request = new ListInsightsAdsRequest(), ?array $options = null): ?AdInsightReport
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
                    path: "api/workspaces/{$workspaceId}/ads/accounts/{$accountId}/insights",
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
                return AdInsightReport::fromJson($json);
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
     * Shows a published post's organic counts on each channel beside what the ads that promote it did, by ad account, and its boosts. Paid numbers are part of what a platform counts on the post: the two are shown side by side, never summed. The organic side is empty for someone who may not read analytics. Needs ads:read.
     *
     * Example:
     * ```php
     * $client->ads->postPerformance(
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
     * @return ?PostAdPerformance
     * @throws PealException
     * @throws PealApiException
     */
    public function postPerformance(string $workspaceId, string $postId, ?array $options = null): ?PostAdPerformance
    {
        $options = array_merge($this->options, $options ?? []);
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/workspaces/{$workspaceId}/ads/posts/{$postId}",
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
                return PostAdPerformance::fromJson($json);
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
     * Checks a boost as `createBoost` would, and says what it would commit and the room it has, without reserving or sending anything: show it before the last step. A total budget commits its amount; a daily budget commits, for each calendar week of the account's zone (Sunday to Saturday) the run touches, its amount and 75% more for each day of the run in that week, which the network may spend on any day, and never more than 7 times its amount, the most the network spends in a week. Needs ads:spend.
     *
     * Example:
     * ```php
     * $client->ads->quoteBoost(
     *     'workspaceId',
     *     new QuoteBoostAdsRequest([
     *         'body' => new NewBoost([
     *             'accountId' => 'accountId',
     *             'audience' => new BoostAudience([
     *                 'ageMax' => 1,
     *                 'ageMin' => 1,
     *                 'countries' => [
     *                     'countries',
     *                 ],
     *             ]),
     *             'budget' => new BoostBudget([
     *                 'amount' => 1000000,
     *                 'kind' => BoostBudgetKind::Total->value,
     *             ]),
     *             'channelId' => 'channelId',
     *             'currency' => 'currency',
     *             'endsAt' => 'endsAt',
     *             'postId' => 'postId',
     *             'specialAdCategory' => SpecialAdCategory::None->value,
     *         ]),
     *     ]),
     * );
     * ```
     *
     * @param string $workspaceId
     * @param QuoteBoostAdsRequest $request
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?BoostQuote
     * @throws PealException
     * @throws PealApiException
     */
    public function quoteBoost(string $workspaceId, QuoteBoostAdsRequest $request, ?array $options = null): ?BoostQuote
    {
        $options = array_merge($this->options, $options ?? []);
        $options['maxRetries'] = 0;
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/workspaces/{$workspaceId}/ads/boosts/quote",
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
                return BoostQuote::fromJson($json);
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
     * Lists the workspace's boosts, newest first, 50 a page, those of one post with `postId`. Pass the page's `nextCursor` as `cursor` for the next one. Needs ads:read.
     *
     * Example:
     * ```php
     * $client->ads->listBoosts(
     *     'workspaceId',
     *     new ListBoostsAdsRequest([]),
     * );
     * ```
     *
     * @param string $workspaceId
     * @param ListBoostsAdsRequest $request
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?BoostPage
     * @throws PealException
     * @throws PealApiException
     */
    public function listBoosts(string $workspaceId, ListBoostsAdsRequest $request = new ListBoostsAdsRequest(), ?array $options = null): ?BoostPage
    {
        $options = array_merge($this->options, $options ?? []);
        $query = [];
        if ($request->cursor != null) {
            $query['cursor'] = $request->cursor;
        }
        if ($request->postId != null) {
            $query['postId'] = $request->postId;
        }
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/workspaces/{$workspaceId}/ads/boosts",
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
                return BoostPage::fromJson($json);
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
     * **Spends money.** Boosts a post the workspace published on a Facebook Page, or on an Instagram account connected through its Page, as an ad on Meta: it spends up to the budget, from the ad account's payment method, until `endsAt`. The `Idempotency-Key` header is required: the same key with the same request answers the boost it made, and never makes another. The boost is accepted as `requested`, its budget counted against the ceiling, and made in the background, paused, then run; read it to see how that ended. It is refused, with nothing reserved or sent, when the server offers no spending, no owner allowed the account to spend, the account or its sign-in cannot run ads, the post cannot be boosted, the boost breaks Peal's rules (an end date within 90 days is required), or the monthly ceiling or the account's own spend cap has no room. On a server that bills, it is refused the same way while the billing account, without a payment method, used the managed ads its month includes (UsageAllowanceReached `paymentMethodRequired`); running boosts are never touched. Needs ads:spend; never staff acting as a member.
     *
     * Example:
     * ```php
     * $client->ads->createBoost(
     *     'workspaceId',
     *     new CreateBoostAdsRequest([
     *         'idempotencyKey' => 'idempotency-key',
     *         'body' => new NewBoost([
     *             'accountId' => 'accountId',
     *             'audience' => new BoostAudience([
     *                 'ageMax' => 1,
     *                 'ageMin' => 1,
     *                 'countries' => [
     *                     'countries',
     *                 ],
     *             ]),
     *             'budget' => new BoostBudget([
     *                 'amount' => 1000000,
     *                 'kind' => BoostBudgetKind::Total->value,
     *             ]),
     *             'channelId' => 'channelId',
     *             'currency' => 'currency',
     *             'endsAt' => 'endsAt',
     *             'postId' => 'postId',
     *             'specialAdCategory' => SpecialAdCategory::None->value,
     *         ]),
     *     ]),
     * );
     * ```
     *
     * @param string $workspaceId
     * @param CreateBoostAdsRequest $request
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?Boost
     * @throws PealException
     * @throws PealApiException
     */
    public function createBoost(string $workspaceId, CreateBoostAdsRequest $request, ?array $options = null): ?Boost
    {
        $options = array_merge($this->options, $options ?? []);
        $options['maxRetries'] = 0;
        $headers = [];
        $headers['idempotency-key'] = $request->idempotencyKey;
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/workspaces/{$workspaceId}/ads/boosts",
                    method: HttpMethod::POST,
                    headers: $headers,
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
                return Boost::fromJson($json);
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
     * Shows a boost and the journal of the requests Peal sent the network for it, each with how it ended. Needs ads:read.
     *
     * Example:
     * ```php
     * $client->ads->getBoost(
     *     'workspaceId',
     *     'boostId',
     * );
     * ```
     *
     * @param string $workspaceId
     * @param string $boostId
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?BoostDetail
     * @throws PealException
     * @throws PealApiException
     */
    public function getBoost(string $workspaceId, string $boostId, ?array $options = null): ?BoostDetail
    {
        $options = array_merge($this->options, $options ?? []);
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/workspaces/{$workspaceId}/ads/boosts/{$boostId}",
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
                return BoostDetail::fromJson($json);
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
     * Pauses a boost that runs or may run: its campaign is told to pause, and the boost is `paused` once the network confirms. Asked twice, it is done once. Its budget stays counted against the ceiling. Needs ads:spend or ads:manage.
     *
     * Example:
     * ```php
     * $client->ads->pauseBoost(
     *     'workspaceId',
     *     'boostId',
     * );
     * ```
     *
     * @param string $workspaceId
     * @param string $boostId
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?Boost
     * @throws PealException
     * @throws PealApiException
     */
    public function pauseBoost(string $workspaceId, string $boostId, ?array $options = null): ?Boost
    {
        $options = array_merge($this->options, $options ?? []);
        $options['maxRetries'] = 0;
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/workspaces/{$workspaceId}/ads/boosts/{$boostId}/pause",
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
                return Boost::fromJson($json);
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
     * **Spends money.** Runs a paused boost again, until its end. Resuming spends, so it is checked as a new boost is: spending still allowed, the account usable, and the ceiling, as it now is, not passed by what the account's boosts commit. Needs ads:spend.
     *
     * Example:
     * ```php
     * $client->ads->resumeBoost(
     *     'workspaceId',
     *     'boostId',
     * );
     * ```
     *
     * @param string $workspaceId
     * @param string $boostId
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?Boost
     * @throws PealException
     * @throws PealApiException
     */
    public function resumeBoost(string $workspaceId, string $boostId, ?array $options = null): ?Boost
    {
        $options = array_merge($this->options, $options ?? []);
        $options['maxRetries'] = 0;
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/workspaces/{$workspaceId}/ads/boosts/{$boostId}/resume",
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
                return Boost::fromJson($json);
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
     * Stops a boost for good: its campaign is told to pause, and the boost is `stopped` once the network confirms; one not yet made is never made. Asked twice, it is done once. A stopped boost does not run again. What it committed is counted down to what it can have cost: nothing if it never ran, the days it ran for a daily budget, its whole budget for a total one. Needs ads:spend or ads:manage.
     *
     * Example:
     * ```php
     * $client->ads->stopBoost(
     *     'workspaceId',
     *     'boostId',
     * );
     * ```
     *
     * @param string $workspaceId
     * @param string $boostId
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?Boost
     * @throws PealException
     * @throws PealApiException
     */
    public function stopBoost(string $workspaceId, string $boostId, ?array $options = null): ?Boost
    {
        $options = array_merge($this->options, $options ?? []);
        $options['maxRetries'] = 0;
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/workspaces/{$workspaceId}/ads/boosts/{$boostId}/stop",
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
                return Boost::fromJson($json);
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
     * Lists the ads audit trail, newest first, 100 a page: every decision about spending and every change to a boost, with who made it and the amounts. Kept 13 months. Answers to owners alone (ads:authorize).
     *
     * Example:
     * ```php
     * $client->ads->auditTrail(
     *     'workspaceId',
     *     new AuditTrailAdsRequest([]),
     * );
     * ```
     *
     * @param string $workspaceId
     * @param AuditTrailAdsRequest $request
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?AdAuditPage
     * @throws PealException
     * @throws PealApiException
     */
    public function auditTrail(string $workspaceId, AuditTrailAdsRequest $request = new AuditTrailAdsRequest(), ?array $options = null): ?AdAuditPage
    {
        $options = array_merge($this->options, $options ?? []);
        $query = [];
        if ($request->cursor != null) {
            $query['cursor'] = $request->cursor;
        }
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/workspaces/{$workspaceId}/ads/audit",
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
                return AdAuditPage::fromJson($json);
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
