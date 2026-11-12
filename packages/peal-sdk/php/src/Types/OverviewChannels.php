<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class OverviewChannels extends JsonSerializableType
{
    /**
     * @var int $connected
     */
    #[JsonProperty('connected')]
    public int $connected;

    /**
     * @var int $off
     */
    #[JsonProperty('off')]
    public int $off;

    /**
     * @var int $toReconnect
     */
    #[JsonProperty('toReconnect')]
    public int $toReconnect;

    /**
     * @param array{
     *   connected: int,
     *   off: int,
     *   toReconnect: int,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->connected = $values['connected'];
        $this->off = $values['off'];
        $this->toReconnect = $values['toReconnect'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
