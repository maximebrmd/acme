<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class ChannelMetrics extends JsonSerializableType
{
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
     * @var string $channelId
     */
    #[JsonProperty('channelId')]
    public string $channelId;

    /**
     * @param array{
     *   likes: int,
     *   posts: int,
     *   replies: int,
     *   reposts: int,
     *   channelId: string,
     *   impressions?: ?int,
     *   quotes?: ?int,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->impressions = $values['impressions'] ?? null;
        $this->likes = $values['likes'];
        $this->posts = $values['posts'];
        $this->quotes = $values['quotes'] ?? null;
        $this->replies = $values['replies'];
        $this->reposts = $values['reposts'];
        $this->channelId = $values['channelId'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
