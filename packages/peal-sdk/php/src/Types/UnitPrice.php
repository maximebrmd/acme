<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class UnitPrice extends JsonSerializableType
{
    /**
     * @var int $cents
     */
    #[JsonProperty('cents')]
    public int $cents;

    /**
     * @var int $per
     */
    #[JsonProperty('per')]
    public int $per;

    /**
     * @param array{
     *   cents: int,
     *   per: int,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->cents = $values['cents'];
        $this->per = $values['per'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
