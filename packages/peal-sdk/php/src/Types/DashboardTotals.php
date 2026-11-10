<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class DashboardTotals extends JsonSerializableType
{
    /**
     * @var ?int $clicks
     */
    #[JsonProperty('clicks')]
    public ?int $clicks;

    /**
     * @var int $engagement
     */
    #[JsonProperty('engagement')]
    public int $engagement;

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
     * @var int $posts
     */
    #[JsonProperty('posts')]
    public int $posts;

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
     *   engagement: int,
     *   likes: int,
     *   posts: int,
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
        $this->engagement = $values['engagement'];
        $this->impressions = $values['impressions'] ?? null;
        $this->likes = $values['likes'];
        $this->posts = $values['posts'];
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
