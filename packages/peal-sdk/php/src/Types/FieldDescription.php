<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;
use Peal\Core\Types\Union;

class FieldDescription extends JsonSerializableType
{
    /**
     * @var array<string> $forbiddenCharacters
     */
    #[JsonProperty('forbiddenCharacters'), ArrayType(['string'])]
    public array $forbiddenCharacters;

    /**
     * @var (
     *    bool
     *   |float
     *   |string
     * )|null $ifLeftOut
     */
    #[JsonProperty('ifLeftOut'), Union('bool', 'float', 'string', 'null')]
    public bool|float|string|null $ifLeftOut;

    /**
     * @var ?value-of<LookupName> $lookup
     */
    #[JsonProperty('lookup')]
    public ?string $lookup;

    /**
     * @var ?int $maxLength
     */
    #[JsonProperty('maxLength')]
    public ?int $maxLength;

    /**
     * @var ?int $maximum
     */
    #[JsonProperty('maximum')]
    public ?int $maximum;

    /**
     * @var ?int $minimum
     */
    #[JsonProperty('minimum')]
    public ?int $minimum;

    /**
     * @var string $name
     */
    #[JsonProperty('name')]
    public string $name;

    /**
     * @var ?string $pattern
     */
    #[JsonProperty('pattern')]
    public ?string $pattern;

    /**
     * @var bool $required
     */
    #[JsonProperty('required')]
    public bool $required;

    /**
     * @var value-of<FieldType> $type
     */
    #[JsonProperty('type')]
    public string $type;

    /**
     * @var array<string> $values
     */
    #[JsonProperty('values'), ArrayType(['string'])]
    public array $values;

    /**
     * @param array{
     *   forbiddenCharacters: array<string>,
     *   name: string,
     *   required: bool,
     *   type: value-of<FieldType>,
     *   values: array<string>,
     *   ifLeftOut?: (
     *    bool
     *   |float
     *   |string
     * )|null,
     *   lookup?: ?value-of<LookupName>,
     *   maxLength?: ?int,
     *   maximum?: ?int,
     *   minimum?: ?int,
     *   pattern?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->forbiddenCharacters = $values['forbiddenCharacters'];
        $this->ifLeftOut = $values['ifLeftOut'] ?? null;
        $this->lookup = $values['lookup'] ?? null;
        $this->maxLength = $values['maxLength'] ?? null;
        $this->maximum = $values['maximum'] ?? null;
        $this->minimum = $values['minimum'] ?? null;
        $this->name = $values['name'];
        $this->pattern = $values['pattern'] ?? null;
        $this->required = $values['required'];
        $this->type = $values['type'];
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
