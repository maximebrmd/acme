<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class PostContentInvalidEncoded extends JsonSerializableType
{
    /**
     * @var array<ContentViolation> $violations
     */
    #[JsonProperty('violations'), ArrayType([ContentViolation::class])]
    public array $violations;

    /**
     * @param array{
     *   violations: array<ContentViolation>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
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
