<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class TooManyReviewLinksEncoded extends JsonSerializableType
{
    /**
     * @var int $limit
     */
    #[JsonProperty('limit')]
    public int $limit;

    /**
     * @param array{
     *   limit: int,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->limit = $values['limit'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
