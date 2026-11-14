<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\Union;

class InboxReviewThread extends JsonSerializableType
{
    /**
     * @var (
     *    float
     *   |value-of<NonFiniteNumber>
     * )|null $averageRating
     */
    #[JsonProperty('averageRating'), Union('float', 'string', 'null')]
    public float|string|null $averageRating;

    /**
     * @var string $channelId
     */
    #[JsonProperty('channelId')]
    public string $channelId;

    /**
     * @var string $id
     */
    #[JsonProperty('id')]
    public string $id;

    /**
     * @var value-of<InboxReviewThreadKind> $kind
     */
    #[JsonProperty('kind')]
    public string $kind;

    /**
     * @var ?string $lastCollectedAt
     */
    #[JsonProperty('lastCollectedAt')]
    public ?string $lastCollectedAt;

    /**
     * @var ?string $lastReviewAt
     */
    #[JsonProperty('lastReviewAt')]
    public ?string $lastReviewAt;

    /**
     * @var int $reviews
     */
    #[JsonProperty('reviews')]
    public int $reviews;

    /**
     * @var ?int $totalReviewCount
     */
    #[JsonProperty('totalReviewCount')]
    public ?int $totalReviewCount;

    /**
     * @var int $unanswered
     */
    #[JsonProperty('unanswered')]
    public int $unanswered;

    /**
     * @param array{
     *   channelId: string,
     *   id: string,
     *   kind: value-of<InboxReviewThreadKind>,
     *   reviews: int,
     *   unanswered: int,
     *   averageRating?: (
     *    float
     *   |value-of<NonFiniteNumber>
     * )|null,
     *   lastCollectedAt?: ?string,
     *   lastReviewAt?: ?string,
     *   totalReviewCount?: ?int,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->averageRating = $values['averageRating'] ?? null;
        $this->channelId = $values['channelId'];
        $this->id = $values['id'];
        $this->kind = $values['kind'];
        $this->lastCollectedAt = $values['lastCollectedAt'] ?? null;
        $this->lastReviewAt = $values['lastReviewAt'] ?? null;
        $this->reviews = $values['reviews'];
        $this->totalReviewCount = $values['totalReviewCount'] ?? null;
        $this->unanswered = $values['unanswered'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
