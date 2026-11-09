<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class PostAnalytics extends JsonSerializableType
{
    /**
     * @var string $postId
     */
    #[JsonProperty('postId')]
    public string $postId;

    /**
     * @var array<TargetMetrics> $targets
     */
    #[JsonProperty('targets'), ArrayType([TargetMetrics::class])]
    public array $targets;

    /**
     * @param array{
     *   postId: string,
     *   targets: array<TargetMetrics>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->postId = $values['postId'];
        $this->targets = $values['targets'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
