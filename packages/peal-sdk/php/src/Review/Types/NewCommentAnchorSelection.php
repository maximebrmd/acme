<?php

namespace Peal\Review\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class NewCommentAnchorSelection extends JsonSerializableType
{
    /**
     * @var string $quote
     */
    #[JsonProperty('quote')]
    public string $quote;

    /**
     * @var int $start
     */
    #[JsonProperty('start')]
    public int $start;

    /**
     * @param array{
     *   quote: string,
     *   start: int,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->quote = $values['quote'];
        $this->start = $values['start'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
