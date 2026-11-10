<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class TargetParts extends JsonSerializableType
{
    /**
     * @var int $count
     */
    #[JsonProperty('count')]
    public int $count;

    /**
     * @var array<LivePart> $live
     */
    #[JsonProperty('live'), ArrayType([LivePart::class])]
    public array $live;

    /**
     * @param array{
     *   count: int,
     *   live: array<LivePart>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->count = $values['count'];
        $this->live = $values['live'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
