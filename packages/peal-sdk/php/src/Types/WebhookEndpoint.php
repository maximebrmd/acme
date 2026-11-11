<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class WebhookEndpoint extends JsonSerializableType
{
    /**
     * @var array<string> $channelIds
     */
    #[JsonProperty('channelIds'), ArrayType(['string'])]
    public array $channelIds;

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
     * @var array<string> $headerNames
     */
    #[JsonProperty('headerNames'), ArrayType(['string'])]
    public array $headerNames;

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
     * @var array<string> $workspaceIds
     */
    #[JsonProperty('workspaceIds'), ArrayType(['string'])]
    public array $workspaceIds;

    /**
     * @param array{
     *   channelIds: array<string>,
     *   createdAt: string,
     *   description: string,
     *   enabled: bool,
     *   eventTypes: array<value-of<SubscribableWebhookEventType>>,
     *   headerNames: array<string>,
     *   id: string,
     *   scope: value-of<WebhookEndpointScope>,
     *   updatedAt: string,
     *   url: string,
     *   workspaceIds: array<string>,
     *   disabledAt?: ?string,
     *   disabledReason?: ?value-of<WebhookDisabledReason>,
     *   failingSince?: ?string,
     *   previousSecretExpiresAt?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->channelIds = $values['channelIds'];
        $this->createdAt = $values['createdAt'];
        $this->description = $values['description'];
        $this->disabledAt = $values['disabledAt'] ?? null;
        $this->disabledReason = $values['disabledReason'] ?? null;
        $this->enabled = $values['enabled'];
        $this->eventTypes = $values['eventTypes'];
        $this->failingSince = $values['failingSince'] ?? null;
        $this->headerNames = $values['headerNames'];
        $this->id = $values['id'];
        $this->previousSecretExpiresAt = $values['previousSecretExpiresAt'] ?? null;
        $this->scope = $values['scope'];
        $this->updatedAt = $values['updatedAt'];
        $this->url = $values['url'];
        $this->workspaceIds = $values['workspaceIds'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
