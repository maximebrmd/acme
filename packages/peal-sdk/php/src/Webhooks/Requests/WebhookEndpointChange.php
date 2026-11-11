<?php

namespace Peal\Webhooks\Requests;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;
use Peal\Types\SubscribableWebhookEventType;
use Peal\Types\WebhookHeaderChange;

class WebhookEndpointChange extends JsonSerializableType
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
     * @var ?array<value-of<SubscribableWebhookEventType>> $eventTypes
     */
    #[JsonProperty('eventTypes'), ArrayType(['string'])]
    public ?array $eventTypes;

    /**
     * @var ?array<WebhookHeaderChange> $headers
     */
    #[JsonProperty('headers'), ArrayType([WebhookHeaderChange::class])]
    public ?array $headers;

    /**
     * @var ?string $url
     */
    #[JsonProperty('url')]
    public ?string $url;

    /**
     * @var ?array<string> $workspaceIds
     */
    #[JsonProperty('workspaceIds'), ArrayType(['string'])]
    public ?array $workspaceIds;

    /**
     * @param array{
     *   channelIds?: ?array<string>,
     *   description?: ?string,
     *   enabled?: ?bool,
     *   eventTypes?: ?array<value-of<SubscribableWebhookEventType>>,
     *   headers?: ?array<WebhookHeaderChange>,
     *   url?: ?string,
     *   workspaceIds?: ?array<string>,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->channelIds = $values['channelIds'] ?? null;
        $this->description = $values['description'] ?? null;
        $this->enabled = $values['enabled'] ?? null;
        $this->eventTypes = $values['eventTypes'] ?? null;
        $this->headers = $values['headers'] ?? null;
        $this->url = $values['url'] ?? null;
        $this->workspaceIds = $values['workspaceIds'] ?? null;
    }
}
