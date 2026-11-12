<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class RecyclingInterval extends JsonSerializableType
{
    /**
     * @var int $count
     */
    #[JsonProperty('count')]
    public int $count;

    /**
     * @var value-of<RecyclingUnit> $unit
     */
    #[JsonProperty('unit')]
    public string $unit;

    /**
     * @param array{
     *   count: int,
     *   unit: value-of<RecyclingUnit>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->count = $values['count'];
        $this->unit = $values['unit'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
