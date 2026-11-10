<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class LookupDescription extends JsonSerializableType
{
    /**
     * @var array<string> $fills
     */
    #[JsonProperty('fills'), ArrayType(['string'])]
    public array $fills;

    /**
     * @var array<FieldDescription> $input
     */
    #[JsonProperty('input'), ArrayType([FieldDescription::class])]
    public array $input;

    /**
     * @var value-of<LookupName> $name
     */
    #[JsonProperty('name')]
    public string $name;

    /**
     * @var bool $paged
     */
    #[JsonProperty('paged')]
    public bool $paged;

    /**
     * @var value-of<Platform> $platform
     */
    #[JsonProperty('platform')]
    public string $platform;

    /**
     * @param array{
     *   fills: array<string>,
     *   input: array<FieldDescription>,
     *   name: value-of<LookupName>,
     *   paged: bool,
     *   platform: value-of<Platform>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->fills = $values['fills'];
        $this->input = $values['input'];
        $this->name = $values['name'];
        $this->paged = $values['paged'];
        $this->platform = $values['platform'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
