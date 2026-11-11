<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class MeteredPosts extends JsonSerializableType
{
    /**
     * @var string $month
     */
    #[JsonProperty('month')]
    public string $month;

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
     * @var int $postsWithLinks
     */
    #[JsonProperty('postsWithLinks')]
    public int $postsWithLinks;

    /**
     * @param array{
     *   month: string,
     *   platform: value-of<Platform>,
     *   posts: int,
     *   postsWithLinks: int,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->month = $values['month'];
        $this->platform = $values['platform'];
        $this->posts = $values['posts'];
        $this->postsWithLinks = $values['postsWithLinks'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
