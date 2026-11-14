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
     * @var ?bool $dropped
     */
    #[JsonProperty('dropped')]
    public ?bool $dropped;

    /**
     * @var ?string $editedAt
     */
    #[JsonProperty('editedAt')]
    public ?string $editedAt;

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
     * @var ?string $removedAt
     */
    #[JsonProperty('removedAt')]
    public ?string $removedAt;

    /**
     * @var ?bool $partsLeftOut
     */
    #[JsonProperty('partsLeftOut')]
    public ?bool $partsLeftOut;

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
     * @var ?bool $thumbnailNotSet
     */
    #[JsonProperty('thumbnailNotSet')]
    public ?bool $thumbnailNotSet;

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
     *   dropped?: ?bool,
     *   editedAt?: ?string,
     *   failureReason?: ?value-of<FailureReason>,
     *   keptPrivate?: ?bool,
     *   options?: ?TargetOptions,
     *   permalink?: ?string,
     *   publishedAt?: ?string,
     *   removedAt?: ?string,
     *   partsLeftOut?: ?bool,
     *   thumbnailNotSet?: ?bool,
     *   unconfirmedReason?: ?value-of<UnconfirmedReason>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->channelId = $values['channelId'];
        $this->dropped = $values['dropped'] ?? null;
        $this->editedAt = $values['editedAt'] ?? null;
        $this->failureReason = $values['failureReason'] ?? null;
        $this->id = $values['id'];
        $this->keptPrivate = $values['keptPrivate'] ?? null;
        $this->options = $values['options'] ?? null;
        $this->parts = $values['parts'];
        $this->permalink = $values['permalink'] ?? null;
        $this->publishedAt = $values['publishedAt'] ?? null;
        $this->removedAt = $values['removedAt'] ?? null;
        $this->partsLeftOut = $values['partsLeftOut'] ?? null;
        $this->round = $values['round'];
        $this->status = $values['status'];
        $this->thumbnailNotSet = $values['thumbnailNotSet'] ?? null;
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
