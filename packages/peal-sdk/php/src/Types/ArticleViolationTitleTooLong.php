<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class ArticleViolationTitleTooLong extends JsonSerializableType
{
    /**
     * @var int $maximum
     */
    #[JsonProperty('maximum')]
    public int $maximum;

    /**
     * @param array{
     *   maximum: int,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
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
