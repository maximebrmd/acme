<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class PostTarget extends JsonSerializableType
{
    /**
     * @var string $channelId
     */
    #[JsonProperty('channelId')]
    public string $channelId;

    /**
     * @var ?value-of<FailureReason> $failureReason
     */
    #[JsonProperty('failureReason')]
    public ?string $failureReason;

    /**
     * @var string $id
     */
    #[JsonProperty('id')]
    public string $id;

    /**
     * @var ?bool $keptPrivate
     */
    #[JsonProperty('keptPrivate')]
    public ?bool $keptPrivate;

    /**
     * @var ?TargetOptions $options
     */
    #[JsonProperty('options')]
    public ?TargetOptions $options;

    /**
     * @var TargetParts $parts
     */
    #[JsonProperty('parts')]
    public TargetParts $parts;

    /**
     * @var ?string $permalink
     */
    #[JsonProperty('permalink')]
    public ?string $permalink;

    /**
     * @var ?string $publishedAt
     */
    #[JsonProperty('publishedAt')]
    public ?string $publishedAt;

    /**
     * @var int $round
     */
    #[JsonProperty('round')]
    public int $round;

    /**
     * @var value-of<PostTargetStatus> $status
     */
    #[JsonProperty('status')]
    public string $status;

    /**
     * @var ?value-of<UnconfirmedReason> $unconfirmedReason
     */
    #[JsonProperty('unconfirmedReason')]
    public ?string $unconfirmedReason;

    /**
     * @param array{
     *   channelId: string,
     *   id: string,
     *   parts: TargetParts,
     *   round: int,
     *   status: value-of<PostTargetStatus>,
     *   failureReason?: ?value-of<FailureReason>,
     *   keptPrivate?: ?bool,
     *   options?: ?TargetOptions,
     *   permalink?: ?string,
     *   publishedAt?: ?string,
     *   unconfirmedReason?: ?value-of<UnconfirmedReason>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->channelId = $values['channelId'];
        $this->failureReason = $values['failureReason'] ?? null;
        $this->id = $values['id'];
        $this->keptPrivate = $values['keptPrivate'] ?? null;
        $this->options = $values['options'] ?? null;
        $this->parts = $values['parts'];
        $this->permalink = $values['permalink'] ?? null;
        $this->publishedAt = $values['publishedAt'] ?? null;
        $this->round = $values['round'];
        $this->status = $values['status'];
        $this->unconfirmedReason = $values['unconfirmedReason'] ?? null;
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
