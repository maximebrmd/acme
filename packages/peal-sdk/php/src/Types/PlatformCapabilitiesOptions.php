<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class PlatformCapabilitiesOptions extends JsonSerializableType
{
    /**
     * @var array<OptionConstraint> $constraints
     */
    #[JsonProperty('constraints'), ArrayType([OptionConstraint::class])]
    public array $constraints;

    /**
     * @var array<FieldDescription> $fields
     */
    #[JsonProperty('fields'), ArrayType([FieldDescription::class])]
    public array $fields;

    /**
     * @param array{
     *   constraints: array<OptionConstraint>,
     *   fields: array<FieldDescription>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->constraints = $values['constraints'];
        $this->fields = $values['fields'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
