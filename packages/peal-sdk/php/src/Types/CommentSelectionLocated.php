<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class CommentSelectionLocated extends JsonSerializableType
{
    /**
     * @var int $end
     */
    #[JsonProperty('end')]
    public int $end;

    /**
     * @var int $start
     */
    #[JsonProperty('start')]
    public int $start;

    /**
     * @param array{
     *   end: int,
     *   start: int,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->end = $values['end'];
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
