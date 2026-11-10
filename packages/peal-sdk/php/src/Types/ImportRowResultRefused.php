<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class ImportRowResultRefused extends JsonSerializableType
{
    /**
     * @var PostRefusal $refusal
     */
    #[JsonProperty('refusal')]
    public PostRefusal $refusal;

    /**
     * @var int $row
     */
    #[JsonProperty('row')]
    public int $row;

    /**
     * @param array{
     *   refusal: PostRefusal,
     *   row: int,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->refusal = $values['refusal'];
        $this->row = $values['row'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
