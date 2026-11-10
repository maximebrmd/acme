<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class ChannelPageCounts extends JsonSerializableType
{
    /**
     * @var int $active
     */
    #[JsonProperty('active')]
    public int $active;

    /**
     * @var int $disabled
     */
    #[JsonProperty('disabled')]
    public int $disabled;

    /**
     * @var int $refreshNeeded
     */
    #[JsonProperty('refreshNeeded')]
    public int $refreshNeeded;

    /**
     * @param array{
     *   active: int,
     *   disabled: int,
     *   refreshNeeded: int,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->active = $values['active'];
        $this->disabled = $values['disabled'];
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
