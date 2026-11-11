<?php

namespace Peal\Webhooks\Requests;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;
use Peal\Types\SubscribableWebhookEventType;
use Peal\Types\WebhookHeader;
use Peal\Types\WebhookEndpointScope;

class NewWebhookEndpoint extends JsonSerializableType
{
    /**
     * @var ?array<string> $channelIds
     */
    #[JsonProperty('channelIds'), ArrayType(['string'])]
    public ?array $channelIds;

    /**
     * @var ?string $description
     */
    #[JsonProperty('description')]
    public ?string $description;

    /**
     * @var ?bool $enabled
     */
    #[JsonProperty('enabled')]
    public ?bool $enabled;

    /**
     * @var array<value-of<SubscribableWebhookEventType>> $eventTypes
     */
    #[JsonProperty('eventTypes'), ArrayType(['string'])]
    public array $eventTypes;

    /**
     * @var ?array<WebhookHeader> $headers
     */
    #[JsonProperty('headers'), ArrayType([WebhookHeader::class])]
    public ?array $headers;

    /**
     * @var ?value-of<WebhookEndpointScope> $scope
     */
    #[JsonProperty('scope')]
    public ?string $scope;

    /**
     * @var string $url
     */
    #[JsonProperty('url')]
    public string $url;

    /**
     * @var ?array<string> $workspaceIds
     */
    #[JsonProperty('workspaceIds'), ArrayType(['string'])]
    public ?array $workspaceIds;

    /**
     * @param array{
     *   eventTypes: array<value-of<SubscribableWebhookEventType>>,
     *   url: string,
     *   channelIds?: ?array<string>,
     *   description?: ?string,
     *   enabled?: ?bool,
     *   headers?: ?array<WebhookHeader>,
     *   scope?: ?value-of<WebhookEndpointScope>,
     *   workspaceIds?: ?array<string>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->channelIds = $values['channelIds'] ?? null;
        $this->description = $values['description'] ?? null;
        $this->enabled = $values['enabled'] ?? null;
        $this->eventTypes = $values['eventTypes'];
        $this->headers = $values['headers'] ?? null;
        $this->scope = $values['scope'] ?? null;
        $this->url = $values['url'];
        $this->workspaceIds = $values['workspaceIds'] ?? null;
    }
}
