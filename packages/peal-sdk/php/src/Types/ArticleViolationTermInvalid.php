<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class ArticleViolationTermInvalid extends JsonSerializableType
{
    /**
     * @var value-of<ArticleViolationTermInvalidField> $field
     */
    #[JsonProperty('field')]
    public string $field;

    /**
     * @param array{
     *   field: value-of<ArticleViolationTermInvalidField>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->field = $values['field'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
