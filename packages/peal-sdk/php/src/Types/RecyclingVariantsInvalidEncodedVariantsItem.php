<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class RecyclingVariantsInvalidEncodedVariantsItem extends JsonSerializableType
{
    /**
     * @var int $variant
     */
    #[JsonProperty('variant')]
    public int $variant;

    /**
     * @var array<ContentViolation> $violations
     */
    #[JsonProperty('violations'), ArrayType([ContentViolation::class])]
    public array $violations;

    /**
     * @param array{
     *   variant: int,
     *   violations: array<ContentViolation>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->variant = $values['variant'];
        $this->violations = $values['violations'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
