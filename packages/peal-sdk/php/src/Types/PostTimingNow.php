<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class PostTimingNow extends JsonSerializableType
{
    /**
     * @var ?string $timeZone
     */
    #[JsonProperty('timeZone')]
    public ?string $timeZone;

    /**
     * @param array{
     *   timeZone?: ?string,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->timeZone = $values['timeZone'] ?? null;
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
