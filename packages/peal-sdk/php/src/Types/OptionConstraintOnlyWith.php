<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class OptionConstraintOnlyWith extends JsonSerializableType
{
    /**
     * @var string $field
     */
    #[JsonProperty('field')]
    public string $field;

    /**
     * @var string $other
     */
    #[JsonProperty('other')]
    public string $other;

    /**
     * @var array<string> $values
     */
    #[JsonProperty('values'), ArrayType(['string'])]
    public array $values;

    /**
     * @param array{
     *   field: string,
     *   other: string,
     *   values: array<string>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->field = $values['field'];
        $this->other = $values['other'];
        $this->values = $values['values'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
