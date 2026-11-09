<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class ChannelStatusDisabled extends JsonSerializableType
{
    /**
     * @var bool $refreshNeeded
     */
    #[JsonProperty('refreshNeeded')]
    public bool $refreshNeeded;

    /**
     * @param array{
     *   refreshNeeded: bool,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->refreshNeeded = $values['refreshNeeded'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
