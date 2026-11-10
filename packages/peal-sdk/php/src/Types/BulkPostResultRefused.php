<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class BulkPostResultRefused extends JsonSerializableType
{
    /**
     * @var int $index
     */
    #[JsonProperty('index')]
    public int $index;

    /**
     * @var PostRefusal $refusal
     */
    #[JsonProperty('refusal')]
    public PostRefusal $refusal;

    /**
     * @param array{
     *   index: int,
     *   refusal: PostRefusal,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->index = $values['index'];
        $this->refusal = $values['refusal'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
