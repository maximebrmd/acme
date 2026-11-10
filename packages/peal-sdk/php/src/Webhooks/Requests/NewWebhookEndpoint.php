<?php

namespace Peal\Webhooks\Requests;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Types\SubscribableWebhookEventType;
use Peal\Core\Types\ArrayType;
use Peal\Types\WebhookEndpointScope;

class NewWebhookEndpoint extends JsonSerializableType
{
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
     * @param array{
     *   eventTypes: array<value-of<SubscribableWebhookEventType>>,
     *   url: string,
     *   description?: ?string,
     *   enabled?: ?bool,
     *   scope?: ?value-of<WebhookEndpointScope>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->description = $values['description'] ?? null;
        $this->enabled = $values['enabled'] ?? null;
        $this->eventTypes = $values['eventTypes'];
        $this->scope = $values['scope'] ?? null;
        $this->url = $values['url'];
    }
}
