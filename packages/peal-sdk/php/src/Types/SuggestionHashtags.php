<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class SuggestionHashtags extends JsonSerializableType
{
    /**
     * @var array<string> $hashtags
     */
    #[JsonProperty('hashtags'), ArrayType(['string'])]
    public array $hashtags;

    /**
     * @param array{
     *   hashtags: array<string>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->hashtags = $values['hashtags'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
