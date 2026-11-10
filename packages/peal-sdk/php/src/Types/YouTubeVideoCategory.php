<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class YouTubeVideoCategory extends JsonSerializableType
{
    /**
     * @var string $id
     */
    #[JsonProperty('id')]
    public string $id;

    /**
     * @var string $title
     */
    #[JsonProperty('title')]
    public string $title;

    /**
     * @param array{
     *   id: string,
     *   title: string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->id = $values['id'];
        $this->title = $values['title'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
