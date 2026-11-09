<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class MetricsSnapshot extends JsonSerializableType
{
    /**
     * @var string $collectedAt
     */
    #[JsonProperty('collectedAt')]
    public string $collectedAt;

    /**
     * @var PostMetrics $metrics
     */
    #[JsonProperty('metrics')]
    public PostMetrics $metrics;

    /**
     * @param array{
     *   collectedAt: string,
     *   metrics: PostMetrics,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->collectedAt = $values['collectedAt'];
        $this->metrics = $values['metrics'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
