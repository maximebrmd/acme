<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class ApprovalRequest extends JsonSerializableType
{
    /**
     * @var ?ApprovalRequestDecision $decision
     */
    #[JsonProperty('decision')]
    public ?ApprovalRequestDecision $decision;

    /**
     * @var string $id
     */
    #[JsonProperty('id')]
    public string $id;

    /**
     * @var string $postId
     */
    #[JsonProperty('postId')]
    public string $postId;

    /**
     * @var string $requestedAt
     */
    #[JsonProperty('requestedAt')]
    public string $requestedAt;

    /**
     * @var ?string $requestedBy
     */
    #[JsonProperty('requestedBy')]
    public ?string $requestedBy;

    /**
     * @var ?string $requestedByName
     */
    #[JsonProperty('requestedByName')]
    public ?string $requestedByName;

    /**
     * @var value-of<ApprovalOrigin> $requestedVia
     */
    #[JsonProperty('requestedVia')]
    public string $requestedVia;

    /**
     * @var PostSchedule $schedule
     */
    #[JsonProperty('schedule')]
    public PostSchedule $schedule;

    /**
     * @var value-of<ApprovalStatus> $status
     */
    #[JsonProperty('status')]
    public string $status;

    /**
     * @param array{
     *   id: string,
     *   postId: string,
     *   requestedAt: string,
     *   requestedVia: value-of<ApprovalOrigin>,
     *   schedule: PostSchedule,
     *   status: value-of<ApprovalStatus>,
     *   decision?: ?ApprovalRequestDecision,
     *   requestedBy?: ?string,
     *   requestedByName?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->decision = $values['decision'] ?? null;
        $this->id = $values['id'];
        $this->postId = $values['postId'];
        $this->requestedAt = $values['requestedAt'];
        $this->requestedBy = $values['requestedBy'] ?? null;
        $this->requestedByName = $values['requestedByName'] ?? null;
        $this->requestedVia = $values['requestedVia'];
        $this->schedule = $values['schedule'];
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
