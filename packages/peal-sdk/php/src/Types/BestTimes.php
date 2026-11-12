<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class BestTimes extends JsonSerializableType
{
    /**
     * @var array<BestTimesHour> $best
     */
    #[JsonProperty('best'), ArrayType([BestTimesHour::class])]
    public array $best;

    /**
     * @var array<BestTimesHour> $buckets
     */
    #[JsonProperty('buckets'), ArrayType([BestTimesHour::class])]
    public array $buckets;

    /**
     * @var string $channelId
     */
    #[JsonProperty('channelId')]
    public string $channelId;

    /**
     * @var bool $counted
     */
    #[JsonProperty('counted')]
    public bool $counted;

    /**
     * @var int $days
     */
    #[JsonProperty('days')]
    public int $days;

    /**
     * @var bool $enough
     */
    #[JsonProperty('enough')]
    public bool $enough;

    /**
     * @var string $from
     */
    #[JsonProperty('from')]
    public string $from;

    /**
     * @var int $minimumPosts
     */
    #[JsonProperty('minimumPosts')]
    public int $minimumPosts;

    /**
     * @var int $minimumPostsPerHour
     */
    #[JsonProperty('minimumPostsPerHour')]
    public int $minimumPostsPerHour;

    /**
     * @var value-of<Platform> $platform
     */
    #[JsonProperty('platform')]
    public string $platform;

    /**
     * @var int $posts
     */
    #[JsonProperty('posts')]
    public int $posts;

    /**
     * @var int $recent
     */
    #[JsonProperty('recent')]
    public int $recent;

    /**
     * @var string $timeZone
     */
    #[JsonProperty('timeZone')]
    public string $timeZone;

    /**
     * @var string $to
     */
    #[JsonProperty('to')]
    public string $to;

    /**
     * @param array{
     *   best: array<BestTimesHour>,
     *   buckets: array<BestTimesHour>,
     *   channelId: string,
     *   counted: bool,
     *   days: int,
     *   enough: bool,
     *   from: string,
     *   minimumPosts: int,
     *   minimumPostsPerHour: int,
     *   platform: value-of<Platform>,
     *   posts: int,
     *   recent: int,
     *   timeZone: string,
     *   to: string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->best = $values['best'];
        $this->buckets = $values['buckets'];
        $this->channelId = $values['channelId'];
        $this->counted = $values['counted'];
        $this->days = $values['days'];
        $this->enough = $values['enough'];
        $this->from = $values['from'];
        $this->minimumPosts = $values['minimumPosts'];
        $this->minimumPostsPerHour = $values['minimumPostsPerHour'];
        $this->platform = $values['platform'];
        $this->posts = $values['posts'];
        $this->recent = $values['recent'];
        $this->timeZone = $values['timeZone'];
        $this->to = $values['to'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
