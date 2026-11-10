<?php

namespace Peal\ChannelDefaults;

use Psr\Http\Client\ClientInterface;
use Peal\Core\Client\RawClient;
use Peal\Types\ChannelDefaults;
use Peal\Exceptions\PealException;
use Peal\Exceptions\PealApiException;
use Peal\Core\Json\JsonApiRequest;
use Peal\Environments;
use Peal\Core\Client\HttpMethod;
use JsonException;
use Psr\Http\Client\ClientExceptionInterface;
use Peal\ChannelDefaults\Requests\NewChannelDefaults;

class ChannelDefaultsClient
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
     * Answers the options new posts take on the channel when they give none there, or null. Needs post:read and channel:read.
     *
     * Example:
     * ```php
     * $client->channelDefaults->get(
     *     'workspaceId',
     *     'channelId',
     * );
     * ```
     *
     * @param string $workspaceId
     * @param string $channelId
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?ChannelDefaults
     * @throws PealException
     * @throws PealApiException
     */
    public function get(string $workspaceId, string $channelId, ?array $options = null): ?ChannelDefaults
    {
        $options = array_merge($this->options, $options ?? []);
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/workspaces/{$workspaceId}/channels/{$channelId}/default-options",
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
                return ChannelDefaults::fromJson($json);
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
     * Keeps these as the channel's default options, instead of any it had: options of the channel's own platform (`TargetOptions`), unfinished as a draft's may be. A new draft, and a post made in one call, takes them on the channel when it gives no options there and no channel set it names does; a draft that is updated keeps what it is given. Defaults are a starting point, never a way round the rules: a post that takes them is checked when it is scheduled as one that wrote them itself. Needs post:update and channel:read.
     *
     * Example:
     * ```php
     * $client->channelDefaults->set(
     *     'workspaceId',
     *     'channelId',
     *     new NewChannelDefaults([
     *         'options' => TargetOptions::youtube(new YouTubeOptions([])),
     *     ]),
     * );
     * ```
     *
     * @param string $workspaceId
     * @param string $channelId
     * @param NewChannelDefaults $request
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?ChannelDefaults
     * @throws PealException
     * @throws PealApiException
     */
    public function set(string $workspaceId, string $channelId, NewChannelDefaults $request, ?array $options = null): ?ChannelDefaults
    {
        $options = array_merge($this->options, $options ?? []);
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/workspaces/{$workspaceId}/channels/{$channelId}/default-options",
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
                return ChannelDefaults::fromJson($json);
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
     * Leaves the channel without default options. Posts already made keep theirs. Needs post:update and channel:read.
     *
     * Example:
     * ```php
     * $client->channelDefaults->clear(
     *     'workspaceId',
     *     'channelId',
     * );
     * ```
     *
     * @param string $workspaceId
     * @param string $channelId
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
    public function clear(string $workspaceId, string $channelId, ?array $options = null): void
    {
        $options = array_merge($this->options, $options ?? []);
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/workspaces/{$workspaceId}/channels/{$channelId}/default-options",
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
}
