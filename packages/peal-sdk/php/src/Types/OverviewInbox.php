<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class OverviewInbox extends JsonSerializableType
{
    /**
     * @var int $unanswered
     */
    #[JsonProperty('unanswered')]
    public int $unanswered;

    /**
     * @param array{
     *   unanswered: int,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->unanswered = $values['unanswered'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
