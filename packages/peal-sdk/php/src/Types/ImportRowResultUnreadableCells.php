<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class ImportRowResultUnreadableCells extends JsonSerializableType
{
    /**
     * @var int $expected
     */
    #[JsonProperty('expected')]
    public int $expected;

    /**
     * @var int $found
     */
    #[JsonProperty('found')]
    public int $found;

    /**
     * @param array{
     *   expected: int,
     *   found: int,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->expected = $values['expected'];
        $this->found = $values['found'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
