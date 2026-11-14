<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

/**
 * The rich-text editor's document: blocks of paragraphs, headings, lists, quotes, rules, code and images.
 */
class ArticleBody extends JsonSerializableType
{
    /**
     * @var array<mixed> $content
     */
    #[JsonProperty('content'), ArrayType(['mixed'])]
    public array $content;

    /**
     * @var value-of<ArticleBodyType> $type
     */
    #[JsonProperty('type')]
    public string $type;

    /**
     * @param array{
     *   content: array<mixed>,
     *   type: value-of<ArticleBodyType>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->content = $values['content'];
        $this->type = $values['type'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
