<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class MeterTerms extends JsonSerializableType
{
    /**
     * @var int $allowance
     */
    #[JsonProperty('allowance')]
    public int $allowance;

    /**
     * @var int $allowanceWithout
     */
    #[JsonProperty('allowanceWithout')]
    public int $allowanceWithout;

    /**
     * @var ?int $ceiling
     */
    #[JsonProperty('ceiling')]
    public ?int $ceiling;

    /**
     * @param array{
     *   allowance: int,
     *   allowanceWithout: int,
     *   ceiling?: ?int,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->allowance = $values['allowance'];
        $this->allowanceWithout = $values['allowanceWithout'];
        $this->ceiling = $values['ceiling'] ?? null;
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
