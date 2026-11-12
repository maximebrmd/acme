<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class PartnerUsageReportDay extends JsonSerializableType
{
    /**
     * @var array<PlatformPosts> $byPlatform
     */
    #[JsonProperty('byPlatform'), ArrayType([PlatformPosts::class])]
    public array $byPlatform;

    /**
     * @var ?int $channels
     */
    #[JsonProperty('channels')]
    public ?int $channels;

    /**
     * @var string $day
     */
    #[JsonProperty('day')]
    public string $day;

    /**
     * @var int $publishedPosts
     */
    #[JsonProperty('publishedPosts')]
    public int $publishedPosts;

    /**
     * @var ?int $workspaces
     */
    #[JsonProperty('workspaces')]
    public ?int $workspaces;

    /**
     * @param array{
     *   byPlatform: array<PlatformPosts>,
     *   day: string,
     *   publishedPosts: int,
     *   channels?: ?int,
     *   workspaces?: ?int,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->byPlatform = $values['byPlatform'];
        $this->channels = $values['channels'] ?? null;
        $this->day = $values['day'];
        $this->publishedPosts = $values['publishedPosts'];
        $this->workspaces = $values['workspaces'] ?? null;
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
