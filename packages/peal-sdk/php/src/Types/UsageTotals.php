<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class UsageTotals extends JsonSerializableType
{
    /**
     * @var array<PlatformPosts> $byPlatform
     */
    #[JsonProperty('byPlatform'), ArrayType([PlatformPosts::class])]
    public array $byPlatform;

    /**
     * @var int $channelDays
     */
    #[JsonProperty('channelDays')]
    public int $channelDays;

    /**
     * @var int $daysCounted
     */
    #[JsonProperty('daysCounted')]
    public int $daysCounted;

    /**
     * @var array<MeteredPosts> $meteredPosts
     */
    #[JsonProperty('meteredPosts'), ArrayType([MeteredPosts::class])]
    public array $meteredPosts;

    /**
     * @var int $publishedPosts
     */
    #[JsonProperty('publishedPosts')]
    public int $publishedPosts;

    /**
     * @param array{
     *   byPlatform: array<PlatformPosts>,
     *   channelDays: int,
     *   daysCounted: int,
     *   meteredPosts: array<MeteredPosts>,
     *   publishedPosts: int,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->byPlatform = $values['byPlatform'];
        $this->channelDays = $values['channelDays'];
        $this->daysCounted = $values['daysCounted'];
        $this->meteredPosts = $values['meteredPosts'];
        $this->publishedPosts = $values['publishedPosts'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
