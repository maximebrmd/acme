<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class OrganicCounts extends JsonSerializableType
{
    /**
     * @var string $channelId
     */
    #[JsonProperty('channelId')]
    public string $channelId;

    /**
     * @var ?int $impressions
     */
    #[JsonProperty('impressions')]
    public ?int $impressions;

    /**
     * @var ?int $likes
     */
    #[JsonProperty('likes')]
    public ?int $likes;

    /**
     * @var ?string $readAt
     */
    #[JsonProperty('readAt')]
    public ?string $readAt;

    /**
     * @var ?int $replies
     */
    #[JsonProperty('replies')]
    public ?int $replies;

    /**
     * @var ?int $reposts
     */
    #[JsonProperty('reposts')]
    public ?int $reposts;

    /**
     * @param array{
     *   channelId: string,
     *   impressions?: ?int,
     *   likes?: ?int,
     *   readAt?: ?string,
     *   replies?: ?int,
     *   reposts?: ?int,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->channelId = $values['channelId'];
        $this->impressions = $values['impressions'] ?? null;
        $this->likes = $values['likes'] ?? null;
        $this->readAt = $values['readAt'] ?? null;
        $this->replies = $values['replies'] ?? null;
        $this->reposts = $values['reposts'] ?? null;
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
