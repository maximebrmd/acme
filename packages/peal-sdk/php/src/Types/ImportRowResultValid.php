<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class ImportRowResultValid extends JsonSerializableType
{
    /**
     * @var int $row
     */
    #[JsonProperty('row')]
    public int $row;

    /**
     * @param array{
     *   row: int,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->row = $values['row'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
