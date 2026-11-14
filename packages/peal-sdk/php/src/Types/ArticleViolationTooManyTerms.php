<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class ArticleViolationTooManyTerms extends JsonSerializableType
{
    /**
     * @var value-of<ArticleViolationTooManyTermsField> $field
     */
    #[JsonProperty('field')]
    public string $field;

    /**
     * @var int $maximum
     */
    #[JsonProperty('maximum')]
    public int $maximum;

    /**
     * @param array{
     *   field: value-of<ArticleViolationTooManyTermsField>,
     *   maximum: int,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->field = $values['field'];
        $this->maximum = $values['maximum'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
