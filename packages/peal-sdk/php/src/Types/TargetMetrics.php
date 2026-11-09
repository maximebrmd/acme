<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class TargetMetrics extends JsonSerializableType
{
    /**
     * @var string $channelId
     */
    #[JsonProperty('channelId')]
    public string $channelId;

    /**
     * @var bool $collecting
     */
    #[JsonProperty('collecting')]
    public bool $collecting;

    /**
     * @var ?string $lastCollectedAt
     */
    #[JsonProperty('lastCollectedAt')]
    public ?string $lastCollectedAt;

    /**
     * @var ?PostMetrics $latest
     */
    #[JsonProperty('latest')]
    public ?PostMetrics $latest;

    /**
     * @var ?string $permalink
     */
    #[JsonProperty('permalink')]
    public ?string $permalink;

    /**
     * @var string $publishedAt
     */
    #[JsonProperty('publishedAt')]
    public string $publishedAt;

    /**
     * @var array<MetricsSnapshot> $snapshots
     */
    #[JsonProperty('snapshots'), ArrayType([MetricsSnapshot::class])]
    public array $snapshots;

    /**
     * @var string $targetId
     */
    #[JsonProperty('targetId')]
    public string $targetId;

    /**
     * @param array{
     *   channelId: string,
     *   collecting: bool,
     *   publishedAt: string,
     *   snapshots: array<MetricsSnapshot>,
     *   targetId: string,
     *   lastCollectedAt?: ?string,
     *   latest?: ?PostMetrics,
     *   permalink?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->channelId = $values['channelId'];
        $this->collecting = $values['collecting'];
        $this->lastCollectedAt = $values['lastCollectedAt'] ?? null;
        $this->latest = $values['latest'] ?? null;
        $this->permalink = $values['permalink'] ?? null;
        $this->publishedAt = $values['publishedAt'];
        $this->snapshots = $values['snapshots'];
        $this->targetId = $values['targetId'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
