<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class PollCapabilitiesDurationMinutes extends JsonSerializableType
{
    /**
     * @var int $maximum
     */
    #[JsonProperty('maximum')]
    public int $maximum;

    /**
     * @var int $minimum
     */
    #[JsonProperty('minimum')]
    public int $minimum;

    /**
     * @param array{
     *   maximum: int,
     *   minimum: int,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->maximum = $values['maximum'];
        $this->minimum = $values['minimum'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
