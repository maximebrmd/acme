<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class ChannelDay extends JsonSerializableType
{
    /**
     * @var string $date
     */
    #[JsonProperty('date')]
    public string $date;

    /**
     * @var ?int $followers
     */
    #[JsonProperty('followers')]
    public ?int $followers;

    /**
     * @var ?int $following
     */
    #[JsonProperty('following')]
    public ?int $following;

    /**
     * @var int $likes
     */
    #[JsonProperty('likes')]
    public int $likes;

    /**
     * @var ?int $posts
     */
    #[JsonProperty('posts')]
    public ?int $posts;

    /**
     * @var int $quotes
     */
    #[JsonProperty('quotes')]
    public int $quotes;

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
     * @var ?int $views
     */
    #[JsonProperty('views')]
    public ?int $views;

    /**
     * @param array{
     *   date: string,
     *   likes: int,
     *   quotes: int,
     *   replies: int,
     *   reposts: int,
     *   followers?: ?int,
     *   following?: ?int,
     *   posts?: ?int,
     *   reach?: ?int,
     *   views?: ?int,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->date = $values['date'];
        $this->followers = $values['followers'] ?? null;
        $this->following = $values['following'] ?? null;
        $this->likes = $values['likes'];
        $this->posts = $values['posts'] ?? null;
        $this->quotes = $values['quotes'];
        $this->reach = $values['reach'] ?? null;
        $this->replies = $values['replies'];
        $this->reposts = $values['reposts'];
        $this->views = $values['views'] ?? null;
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
