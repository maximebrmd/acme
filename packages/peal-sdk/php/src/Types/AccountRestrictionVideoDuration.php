<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class AccountRestrictionVideoDuration extends JsonSerializableType
{
    /**
     * @var int $maximumMs
     */
    #[JsonProperty('maximumMs')]
    public int $maximumMs;

    /**
     * @param array{
     *   maximumMs: int,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->maximumMs = $values['maximumMs'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
