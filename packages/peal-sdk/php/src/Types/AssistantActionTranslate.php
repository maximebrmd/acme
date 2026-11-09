<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class AssistantActionTranslate extends JsonSerializableType
{
    /**
     * @var value-of<TranslationLanguage> $language
     */
    #[JsonProperty('language')]
    public string $language;

    /**
     * @param array{
     *   language: value-of<TranslationLanguage>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->language = $values['language'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
