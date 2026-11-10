<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class WebhookEndpoint extends JsonSerializableType
{
    /**
     * @var string $createdAt
     */
    #[JsonProperty('createdAt')]
    public string $createdAt;

    /**
     * @var string $description
     */
    #[JsonProperty('description')]
    public string $description;

    /**
     * @var ?string $disabledAt
     */
    #[JsonProperty('disabledAt')]
    public ?string $disabledAt;

    /**
     * @var ?value-of<WebhookDisabledReason> $disabledReason
     */
    #[JsonProperty('disabledReason')]
    public ?string $disabledReason;

    /**
     * @var bool $enabled
     */
    #[JsonProperty('enabled')]
    public bool $enabled;

    /**
     * @var array<value-of<SubscribableWebhookEventType>> $eventTypes
     */
    #[JsonProperty('eventTypes'), ArrayType(['string'])]
    public array $eventTypes;

    /**
     * @var ?string $failingSince
     */
    #[JsonProperty('failingSince')]
    public ?string $failingSince;

    /**
     * @var string $id
     */
    #[JsonProperty('id')]
    public string $id;

    /**
     * @var ?string $previousSecretExpiresAt
     */
    #[JsonProperty('previousSecretExpiresAt')]
    public ?string $previousSecretExpiresAt;

    /**
     * @var value-of<WebhookEndpointScope> $scope
     */
    #[JsonProperty('scope')]
    public string $scope;

    /**
     * @var string $updatedAt
     */
    #[JsonProperty('updatedAt')]
    public string $updatedAt;

    /**
     * @var string $url
     */
    #[JsonProperty('url')]
    public string $url;

    /**
     * @param array{
     *   createdAt: string,
     *   description: string,
     *   enabled: bool,
     *   eventTypes: array<value-of<SubscribableWebhookEventType>>,
     *   id: string,
     *   scope: value-of<WebhookEndpointScope>,
     *   updatedAt: string,
     *   url: string,
     *   disabledAt?: ?string,
     *   disabledReason?: ?value-of<WebhookDisabledReason>,
     *   failingSince?: ?string,
     *   previousSecretExpiresAt?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->createdAt = $values['createdAt'];
        $this->description = $values['description'];
        $this->disabledAt = $values['disabledAt'] ?? null;
        $this->disabledReason = $values['disabledReason'] ?? null;
        $this->enabled = $values['enabled'];
        $this->eventTypes = $values['eventTypes'];
        $this->failingSince = $values['failingSince'] ?? null;
        $this->id = $values['id'];
        $this->previousSecretExpiresAt = $values['previousSecretExpiresAt'] ?? null;
        $this->scope = $values['scope'];
        $this->updatedAt = $values['updatedAt'];
        $this->url = $values['url'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
