<?php

namespace Peal\ChannelSets;

use Psr\Http\Client\ClientInterface;
use Peal\Core\Client\RawClient;
use Peal\Types\ChannelSet;
use Peal\Exceptions\PealException;
use Peal\Exceptions\PealApiException;
use Peal\Core\Json\JsonApiRequest;
use Peal\Environments;
use Peal\Core\Client\HttpMethod;
use Peal\Core\Json\JsonDecoder;
use JsonException;
use Psr\Http\Client\ClientExceptionInterface;
use Peal\ChannelSets\Requests\CreateChannelSetsRequest;
use Peal\ChannelSets\Requests\UpdateChannelSetsRequest;

class ChannelSetsClient
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
     * Lists the workspace's channel sets, oldest first, each with the channels it keeps and those of them disconnected since (`unavailableChannelIds`). Needs post:read and channel:read.
     *
     * Example:
     * ```php
     * $client->channelSets->list(
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
     * @return ?array<ChannelSet>
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
                    path: "api/workspaces/{$workspaceId}/channel-sets",
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
                return JsonDecoder::decodeArray($json, [ChannelSet::class]); // @phpstan-ignore-line
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
     * Saves a selection of the workspace's channels under a name no other set of the workspace has whatever its case, 50 channels at most, with the options posts take on those whose platform has some (`TargetOptions`, of the channel's platform; unfinished options are kept, and checked when a post that takes them is scheduled). A post names a set by its id or its name (`channelSets`) instead of listing its channels. A workspace keeps 50 sets at most. Needs post:update and channel:read.
     *
     * Example:
     * ```php
     * $client->channelSets->create(
     *     'workspaceId',
     *     new CreateChannelSetsRequest([
     *         'body' => new ChannelSetDetails([
     *             'channelIds' => [
     *                 'channelIds',
     *             ],
     *             'name' => 'name',
     *         ]),
     *     ]),
     * );
     * ```
     *
     * @param string $workspaceId
     * @param CreateChannelSetsRequest $request
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?ChannelSet
     * @throws PealException
     * @throws PealApiException
     */
    public function create(string $workspaceId, CreateChannelSetsRequest $request, ?array $options = null): ?ChannelSet
    {
        $options = array_merge($this->options, $options ?? []);
        $options['maxRetries'] = 0;
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/workspaces/{$workspaceId}/channel-sets",
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
                return ChannelSet::fromJson($json);
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
     * Replaces a set's name, channels and options: every channel must be connected now, so this is also how a disconnected one is taken out. Posts made with the set before keep their channels. Needs post:update and channel:read.
     *
     * Example:
     * ```php
     * $client->channelSets->update(
     *     'workspaceId',
     *     'channelSetId',
     *     new UpdateChannelSetsRequest([
     *         'body' => new ChannelSetDetails([
     *             'channelIds' => [
     *                 'channelIds',
     *             ],
     *             'name' => 'name',
     *         ]),
     *     ]),
     * );
     * ```
     *
     * @param string $workspaceId
     * @param string $channelSetId
     * @param UpdateChannelSetsRequest $request
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?ChannelSet
     * @throws PealException
     * @throws PealApiException
     */
    public function update(string $workspaceId, string $channelSetId, UpdateChannelSetsRequest $request, ?array $options = null): ?ChannelSet
    {
        $options = array_merge($this->options, $options ?? []);
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/workspaces/{$workspaceId}/channel-sets/{$channelSetId}",
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
                return ChannelSet::fromJson($json);
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
     * Deletes a channel set. Its channels, and the posts made with it, stay. Needs post:update.
     *
     * Example:
     * ```php
     * $client->channelSets->delete(
     *     'workspaceId',
     *     'channelSetId',
     * );
     * ```
     *
     * @param string $workspaceId
     * @param string $channelSetId
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
    public function delete(string $workspaceId, string $channelSetId, ?array $options = null): void
    {
        $options = array_merge($this->options, $options ?? []);
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/workspaces/{$workspaceId}/channel-sets/{$channelSetId}",
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
