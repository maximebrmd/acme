<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class TagDetails extends JsonSerializableType
{
    /**
     * @var value-of<TagColour> $colour
     */
    #[JsonProperty('colour')]
    public string $colour;

    /**
     * @var string $name
     */
    #[JsonProperty('name')]
    public string $name;

    /**
     * @param array{
     *   colour: value-of<TagColour>,
     *   name: string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->colour = $values['colour'];
        $this->name = $values['name'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
