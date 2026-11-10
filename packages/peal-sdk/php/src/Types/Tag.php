<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class Tag extends JsonSerializableType
{
    /**
     * @var value-of<TagColour> $colour
     */
    #[JsonProperty('colour')]
    public string $colour;

    /**
     * @var string $createdAt
     */
    #[JsonProperty('createdAt')]
    public string $createdAt;

    /**
     * @var string $id
     */
    #[JsonProperty('id')]
    public string $id;

    /**
     * @var string $name
     */
    #[JsonProperty('name')]
    public string $name;

    /**
     * @param array{
     *   colour: value-of<TagColour>,
     *   createdAt: string,
     *   id: string,
     *   name: string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->colour = $values['colour'];
        $this->createdAt = $values['createdAt'];
        $this->id = $values['id'];
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
