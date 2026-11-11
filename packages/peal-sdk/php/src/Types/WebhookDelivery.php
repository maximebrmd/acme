<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class WebhookDelivery extends JsonSerializableType
{
    /**
     * @var int $attempts
     */
    #[JsonProperty('attempts')]
    public int $attempts;

    /**
     * @var ?string $completedAt
     */
    #[JsonProperty('completedAt')]
    public ?string $completedAt;

    /**
     * @var string $createdAt
     */
    #[JsonProperty('createdAt')]
    public string $createdAt;

    /**
     * @var ?int $durationMs
     */
    #[JsonProperty('durationMs')]
    public ?int $durationMs;

    /**
     * @var string $endpointId
     */
    #[JsonProperty('endpointId')]
    public string $endpointId;

    /**
     * @var ?value-of<WebhookAttemptError> $error
     */
    #[JsonProperty('error')]
    public ?string $error;

    /**
     * @var string $eventId
     */
    #[JsonProperty('eventId')]
    public string $eventId;

    /**
     * @var value-of<WebhookEventType> $eventType
     */
    #[JsonProperty('eventType')]
    public string $eventType;

    /**
     * @var ?value-of<WebhookDeliveryFailure> $failureReason
     */
    #[JsonProperty('failureReason')]
    public ?string $failureReason;

    /**
     * @var string $id
     */
    #[JsonProperty('id')]
    public string $id;

    /**
     * @var ?string $lastAttemptAt
     */
    #[JsonProperty('lastAttemptAt')]
    public ?string $lastAttemptAt;

    /**
     * @var ?string $nextAttemptAt
     */
    #[JsonProperty('nextAttemptAt')]
    public ?string $nextAttemptAt;

    /**
     * @var ?string $redeliveryOf
     */
    #[JsonProperty('redeliveryOf')]
    public ?string $redeliveryOf;

    /**
     * @var ?string $responseExcerpt
     */
    #[JsonProperty('responseExcerpt')]
    public ?string $responseExcerpt;

    /**
     * @var ?int $responseStatus
     */
    #[JsonProperty('responseStatus')]
    public ?int $responseStatus;

    /**
     * @var value-of<WebhookDeliveryStatus> $status
     */
    #[JsonProperty('status')]
    public string $status;

    /**
     * @var ?string $workspaceExternalId
     */
    #[JsonProperty('workspaceExternalId')]
    public ?string $workspaceExternalId;

    /**
     * @var string $workspaceId
     */
    #[JsonProperty('workspaceId')]
    public string $workspaceId;

    /**
     * @param array{
     *   attempts: int,
     *   createdAt: string,
     *   endpointId: string,
     *   eventId: string,
     *   eventType: value-of<WebhookEventType>,
     *   id: string,
     *   status: value-of<WebhookDeliveryStatus>,
     *   workspaceId: string,
     *   completedAt?: ?string,
     *   durationMs?: ?int,
     *   error?: ?value-of<WebhookAttemptError>,
     *   failureReason?: ?value-of<WebhookDeliveryFailure>,
     *   lastAttemptAt?: ?string,
     *   nextAttemptAt?: ?string,
     *   redeliveryOf?: ?string,
     *   responseExcerpt?: ?string,
     *   responseStatus?: ?int,
     *   workspaceExternalId?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->attempts = $values['attempts'];
        $this->completedAt = $values['completedAt'] ?? null;
        $this->createdAt = $values['createdAt'];
        $this->durationMs = $values['durationMs'] ?? null;
        $this->endpointId = $values['endpointId'];
        $this->error = $values['error'] ?? null;
        $this->eventId = $values['eventId'];
        $this->eventType = $values['eventType'];
        $this->failureReason = $values['failureReason'] ?? null;
        $this->id = $values['id'];
        $this->lastAttemptAt = $values['lastAttemptAt'] ?? null;
        $this->nextAttemptAt = $values['nextAttemptAt'] ?? null;
        $this->redeliveryOf = $values['redeliveryOf'] ?? null;
        $this->responseExcerpt = $values['responseExcerpt'] ?? null;
        $this->responseStatus = $values['responseStatus'] ?? null;
        $this->status = $values['status'];
        $this->workspaceExternalId = $values['workspaceExternalId'] ?? null;
        $this->workspaceId = $values['workspaceId'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
