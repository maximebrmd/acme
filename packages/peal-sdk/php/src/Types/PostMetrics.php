<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class PostMetrics extends JsonSerializableType
{
    /**
     * @var ?int $clicks
     */
    #[JsonProperty('clicks')]
    public ?int $clicks;

    /**
     * @var ?int $impressions
     */
    #[JsonProperty('impressions')]
    public ?int $impressions;

    /**
     * @var int $likes
     */
    #[JsonProperty('likes')]
    public int $likes;

    /**
     * @var ?int $quotes
     */
    #[JsonProperty('quotes')]
    public ?int $quotes;

    /**
     * @var ?int $reach
     */
    #[JsonProperty('reach')]
    public ?int $reach;

    /**
     * @var int $replies
     */
    #[JsonProperty('replies')]
    public int $replies;

    /**
     * @var int $reposts
     */
    #[JsonProperty('reposts')]
    public int $reposts;

    /**
     * @var ?int $saves
     */
    #[JsonProperty('saves')]
    public ?int $saves;

    /**
     * @param array{
     *   likes: int,
     *   replies: int,
     *   reposts: int,
     *   clicks?: ?int,
     *   impressions?: ?int,
     *   quotes?: ?int,
     *   reach?: ?int,
     *   saves?: ?int,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->clicks = $values['clicks'] ?? null;
        $this->impressions = $values['impressions'] ?? null;
        $this->likes = $values['likes'];
        $this->quotes = $values['quotes'] ?? null;
        $this->reach = $values['reach'] ?? null;
        $this->replies = $values['replies'];
        $this->reposts = $values['reposts'];
        $this->saves = $values['saves'] ?? null;
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
