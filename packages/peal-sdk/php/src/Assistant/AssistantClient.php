<?php

namespace Peal\Assistant;

use Psr\Http\Client\ClientInterface;
use Peal\Core\Client\RawClient;
use Peal\Types\AssistantStatus;
use Peal\Exceptions\PealException;
use Peal\Exceptions\PealApiException;
use Peal\Core\Json\JsonApiRequest;
use Peal\Environments;
use Peal\Core\Client\HttpMethod;
use JsonException;
use Psr\Http\Client\ClientExceptionInterface;
use Peal\Assistant\Requests\SuggestionRequest;
use Peal\Types\Suggestion;
use Peal\Assistant\Requests\ImageRequest;
use Peal\Types\Media;
use Peal\Types\ImageProviderSetting;
use Peal\Assistant\Requests\ImageProviderChange;
use Peal\Types\ImageProvider;
use Peal\Types\TextProviderSetting;
use Peal\Assistant\Requests\TextProviderChange;
use Peal\Types\TextProvider;

class AssistantClient
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
     * Tells whether the assistant writes for the workspace, so clients show it or hide it, and who writes (`source`: the workspace's own text provider, the server's language model, or nobody), who makes the workspace's images (`images.source`: the workspace's own provider, the server's image model, or nobody) and what one costs, and how many requests the workspace has left today. On a server that bills, `month` and `images.month` tell the billing account's month of the server's models (included, used, price and ceiling), and `reason` `paymentMethod` why they are off without a payment method. Needs assistant:use.
     *
     * Example:
     * ```php
     * $client->assistant->status(
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
     * @return ?AssistantStatus
     * @throws PealException
     * @throws PealApiException
     */
    public function status(string $workspaceId, ?array $options = null): ?AssistantStatus
    {
        $options = array_merge($this->options, $options ?? []);
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/workspaces/{$workspaceId}/assistant",
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
                return AssistantStatus::fromJson($json);
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
     * Asks the language model to rewrite, shorten or translate a post's text, to suggest hashtags for it, or to write a first post from a subject (`write`), and answers once the whole suggestion is checked. The text is sent to the model as data, never as instructions. When the workspace brought its own text provider (`source` `workspace` in the status), the text goes there, with the workspace's key, and the request costs none of the workspace's daily requests, on any plan, within a number of such requests a day (OwnTextLimitReached past it) and a few at once (TextProviderBusy past them); if that provider refuses, the answer is TextProviderRefused and the server's model is never asked instead. Otherwise, on a server that does not bill, each request counts toward the workspace's daily quota, unless the model's provider could not be reached (AssistantQuotaExceeded past it). On a server that bills, the server's model needs a payment method on the billing account (UsageAllowanceReached `paymentMethodRequired` without one, before anything is asked): each request counts toward the month's allowance across the account's workspaces (the status's `month`), then is billed at its price up to the ceiling the account set (UsageAllowanceReached `ceilingReached`); a request that brings no suggestion, a timeout included, is not counted. Needs assistant:use.
     *
     * Example:
     * ```php
     * $client->assistant->suggest(
     *     'workspaceId',
     *     new SuggestionRequest([
     *         'action' => AssistantAction::rewrite(new AssistantActionRewrite([
     *             'tone' => AssistantTone::Professional->value,
     *         ])),
     *         'text' => 'text',
     *     ]),
     * );
     * ```
     *
     * @param string $workspaceId
     * @param SuggestionRequest $request
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?Suggestion
     * @throws PealException
     * @throws PealApiException
     */
    public function suggest(string $workspaceId, SuggestionRequest $request, ?array $options = null): ?Suggestion
    {
        $options = array_merge($this->options, $options ?? []);
        $options['maxRetries'] = 0;
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/workspaces/{$workspaceId}/assistant/suggestions",
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
                return Suggestion::fromJson($json);
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
     * Asks for one image from the prompt, in the aspect asked for, and answers with it as a new file of the media library, ready to attach, marked `aiGenerated` and without a description. When the workspace brought its own image provider, the prompt goes there, with the workspace's key, and the image costs none of the workspace's daily requests, on any plan, a trial and the free plan included, within a number of such images a day (OwnImageLimitReached past it); if that provider refuses, the answer is ImageProviderRefused and the server's model is never asked instead. Otherwise the prompt goes to the image provider the server's operator chose. On a server that does not bill, an image costs the status's `images.requestCost` of the workspace's daily requests, given back only when the provider could not be reached. On a server that bills, it needs a payment method on the billing account (UsageAllowanceReached `paymentMethodRequired` without one, before anything is asked) and counts one of the month's images (`images.month`), billed past the allowance up to the account's ceiling (UsageAllowanceReached `ceilingReached`); an image that is not stored, whatever the reason, is not counted. Neither the prompt nor the image is logged. Either way the image takes room in the plan's media storage, which must hold the largest image before anything is asked. The file is stored as the provider gave it. Peal sets no platform's AI label on its own: set it in the post's options (YouTube `containsSyntheticMedia`, TikTok `aiGenerated`, X `madeWithAi`). Needs assistant:use and media:upload. Off unless the workspace brought a provider or the server has an image model (`images.source`).
     *
     * Example:
     * ```php
     * $client->assistant->generateImage(
     *     'workspaceId',
     *     new ImageRequest([
     *         'aspect' => ImageAspect::Square->value,
     *         'prompt' => 'prompt',
     *     ]),
     * );
     * ```
     *
     * @param string $workspaceId
     * @param ImageRequest $request
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?Media
     * @throws PealException
     * @throws PealApiException
     */
    public function generateImage(string $workspaceId, ImageRequest $request, ?array $options = null): ?Media
    {
        $options = array_merge($this->options, $options ?? []);
        $options['maxRetries'] = 0;
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/workspaces/{$workspaceId}/assistant/images",
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
                return Media::fromJson($json);
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
     * Reads the image provider the workspace brought, an endpoint that speaks the OpenAI images API (`POST {baseUrl}/images/generations`), whose images then spend none of the workspace's daily assistant requests: its address and model, never its key, or null. Needs assistant:configure, which no OAuth client holds but Peal's command line (since 2026-11-13; before, any client with workspace:write did).
     *
     * Example:
     * ```php
     * $client->assistant->imageProvider(
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
     * @return ?ImageProviderSetting
     * @throws PealException
     * @throws PealApiException
     */
    public function imageProvider(string $workspaceId, ?array $options = null): ?ImageProviderSetting
    {
        $options = array_merge($this->options, $options ?? []);
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/workspaces/{$workspaceId}/assistant/image-provider",
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
                return ImageProviderSetting::fromJson($json);
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
     * Sets the image provider the workspace brings, an endpoint that speaks the OpenAI images API (`POST {baseUrl}/images/generations`), whose images then spend none of the workspace's daily assistant requests. The workspace's image prompts then go to `baseUrl` with `apiKey` as a bearer token; the images still take room in the plan's media storage. Peal keeps the key encrypted for this workspace and this address, never shows it again, and never sends it to another address: `apiKey` may be left out to keep the stored one only while `baseUrl` stays exactly the same (to change the model alone). The address must be public HTTPS; it is checked now, and before every call. The provider is not called: the first image tells whether the settings work. Needs assistant:configure, which no OAuth client holds but Peal's command line (since 2026-11-13; before, any client with workspace:write did).
     *
     * Example:
     * ```php
     * $client->assistant->setImageProvider(
     *     'workspaceId',
     *     new ImageProviderChange([
     *         'baseUrl' => 'baseUrl',
     *         'model' => 'model',
     *     ]),
     * );
     * ```
     *
     * @param string $workspaceId
     * @param ImageProviderChange $request
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?ImageProvider
     * @throws PealException
     * @throws PealApiException
     */
    public function setImageProvider(string $workspaceId, ImageProviderChange $request, ?array $options = null): ?ImageProvider
    {
        $options = array_merge($this->options, $options ?? []);
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/workspaces/{$workspaceId}/assistant/image-provider",
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
                return ImageProvider::fromJson($json);
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
     * Removes the workspace's image provider and its key: images are made by the server's image model again, if it has one, and cost the workspace's daily requests. Needs assistant:configure, which no OAuth client holds but Peal's command line (since 2026-11-13; before, any client with workspace:write did).
     *
     * Example:
     * ```php
     * $client->assistant->removeImageProvider(
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
     * @throws PealException
     * @throws PealApiException
     */
    public function removeImageProvider(string $workspaceId, ?array $options = null): void
    {
        $options = array_merge($this->options, $options ?? []);
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/workspaces/{$workspaceId}/assistant/image-provider",
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
     * Reads the text provider the workspace brought, Anthropic's Messages API or an endpoint that speaks the OpenAI chat completions API, whose suggestions then spend none of the workspace's daily assistant requests: the API it speaks, its address and model, never its key, or null. Needs assistant:configure.
     *
     * Example:
     * ```php
     * $client->assistant->textProvider(
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
     * @return ?TextProviderSetting
     * @throws PealException
     * @throws PealApiException
     */
    public function textProvider(string $workspaceId, ?array $options = null): ?TextProviderSetting
    {
        $options = array_merge($this->options, $options ?? []);
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/workspaces/{$workspaceId}/assistant/text-provider",
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
                return TextProviderSetting::fromJson($json);
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
     * Sets the text provider the workspace brings, Anthropic's Messages API or an endpoint that speaks the OpenAI chat completions API, whose suggestions then spend none of the workspace's daily assistant requests. The workspace's drafts, and the subjects of the posts it asks the assistant to write, then go to `baseUrl` with `apiKey`, under that provider's terms. Peal keeps the key encrypted for this workspace and this address, never shows it again, and never sends it to another address: `apiKey` may be left out to keep the stored one only while `baseUrl` stays exactly the same (to change the model alone). The address must be public HTTPS; it is checked now, and before every call. The provider is not called: test it with `POST .../text-provider/test`. Needs assistant:configure, which no OAuth client holds but Peal's command line.
     *
     * Example:
     * ```php
     * $client->assistant->setTextProvider(
     *     'workspaceId',
     *     new TextProviderChange([
     *         'baseUrl' => 'baseUrl',
     *         'kind' => TextProviderKind::Anthropic->value,
     *         'model' => 'model',
     *     ]),
     * );
     * ```
     *
     * @param string $workspaceId
     * @param TextProviderChange $request
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?TextProvider
     * @throws PealException
     * @throws PealApiException
     */
    public function setTextProvider(string $workspaceId, TextProviderChange $request, ?array $options = null): ?TextProvider
    {
        $options = array_merge($this->options, $options ?? []);
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/workspaces/{$workspaceId}/assistant/text-provider",
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
                return TextProvider::fromJson($json);
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
     * Removes the workspace's text provider and its key: the server's language model writes again, if it has one, within the workspace's daily requests. Needs assistant:configure.
     *
     * Example:
     * ```php
     * $client->assistant->removeTextProvider(
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
     * @throws PealException
     * @throws PealApiException
     */
    public function removeTextProvider(string $workspaceId, ?array $options = null): void
    {
        $options = array_merge($this->options, $options ?? []);
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/workspaces/{$workspaceId}/assistant/text-provider",
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
     * Sends the workspace's text provider one short request, a rewrite of a fixed sentence, as a member's request would go, and answers 204 once the provider gave a suggestion the assistant can use. Otherwise the answer says why, as a suggestion's would: TextProviderRefused (its settings, a redirect, its address or its key) or AssistantFailed (unreachable, timed out, declined, or an answer the assistant cannot use: often a model without structured output). It counts as one of the day's requests to that provider, and nothing of Peal's. Needs assistant:configure.
     *
     * Example:
     * ```php
     * $client->assistant->testTextProvider(
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
     * @throws PealException
     * @throws PealApiException
     */
    public function testTextProvider(string $workspaceId, ?array $options = null): void
    {
        $options = array_merge($this->options, $options ?? []);
        $options['maxRetries'] = 0;
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "api/workspaces/{$workspaceId}/assistant/text-provider/test",
                    method: HttpMethod::POST,
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
