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
     * @param array{
     *   attempts: int,
     *   createdAt: string,
     *   eventId: string,
     *   eventType: value-of<WebhookEventType>,
     *   id: string,
     *   status: value-of<WebhookDeliveryStatus>,
     *   completedAt?: ?string,
     *   durationMs?: ?int,
     *   error?: ?value-of<WebhookAttemptError>,
     *   failureReason?: ?value-of<WebhookDeliveryFailure>,
     *   lastAttemptAt?: ?string,
     *   nextAttemptAt?: ?string,
     *   responseExcerpt?: ?string,
     *   responseStatus?: ?int,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->attempts = $values['attempts'];
        $this->completedAt = $values['completedAt'] ?? null;
        $this->createdAt = $values['createdAt'];
        $this->durationMs = $values['durationMs'] ?? null;
        $this->error = $values['error'] ?? null;
        $this->eventId = $values['eventId'];
        $this->eventType = $values['eventType'];
        $this->failureReason = $values['failureReason'] ?? null;
        $this->id = $values['id'];
        $this->lastAttemptAt = $values['lastAttemptAt'] ?? null;
        $this->nextAttemptAt = $values['nextAttemptAt'] ?? null;
        $this->responseExcerpt = $values['responseExcerpt'] ?? null;
        $this->responseStatus = $values['responseStatus'] ?? null;
        $this->status = $values['status'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
