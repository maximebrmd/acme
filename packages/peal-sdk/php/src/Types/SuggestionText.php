<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class SuggestionText extends JsonSerializableType
{
    /**
     * @var string $text
     */
    #[JsonProperty('text')]
    public string $text;

    /**
     * @param array{
     *   text: string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->text = $values['text'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
