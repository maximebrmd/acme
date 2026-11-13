<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class RateCardAssistant extends JsonSerializableType
{
    /**
     * @var int $margin
     */
    #[JsonProperty('margin')]
    public int $margin;

    /**
     * @param array{
     *   margin: int,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->margin = $values['margin'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
