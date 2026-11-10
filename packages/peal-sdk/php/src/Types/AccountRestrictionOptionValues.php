<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class AccountRestrictionOptionValues extends JsonSerializableType
{
    /**
     * @var string $field
     */
    #[JsonProperty('field')]
    public string $field;

    /**
     * @var array<string> $values
     */
    #[JsonProperty('values'), ArrayType(['string'])]
    public array $values;

    /**
     * @param array{
     *   field: string,
     *   values: array<string>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->field = $values['field'];
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
