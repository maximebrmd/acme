<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class OptionConstraintNeedsOneOf extends JsonSerializableType
{
    /**
     * @var string $field
     */
    #[JsonProperty('field')]
    public string $field;

    /**
     * @var array<string> $oneOf
     */
    #[JsonProperty('oneOf'), ArrayType(['string'])]
    public array $oneOf;

    /**
     * @param array{
     *   field: string,
     *   oneOf: array<string>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->field = $values['field'];
        $this->oneOf = $values['oneOf'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
