<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class RecyclingComing extends JsonSerializableType
{
    /**
     * @var string $at
     */
    #[JsonProperty('at')]
    public string $at;

    /**
     * @var int $occurrence
     */
    #[JsonProperty('occurrence')]
    public int $occurrence;

    /**
     * @var ?int $variant
     */
    #[JsonProperty('variant')]
    public ?int $variant;

    /**
     * @param array{
     *   at: string,
     *   occurrence: int,
     *   variant?: ?int,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->at = $values['at'];
        $this->occurrence = $values['occurrence'];
        $this->variant = $values['variant'] ?? null;
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
