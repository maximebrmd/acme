<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class LimitedCount extends JsonSerializableType
{
    /**
     * @var int $count
     */
    #[JsonProperty('count')]
    public int $count;

    /**
     * @var ?int $maximum
     */
    #[JsonProperty('maximum')]
    public ?int $maximum;

    /**
     * @param array{
     *   count: int,
     *   maximum?: ?int,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->count = $values['count'];
        $this->maximum = $values['maximum'] ?? null;
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
